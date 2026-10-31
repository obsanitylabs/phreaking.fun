// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

using SafeERC20 for IERC20;

/// @title MysteryBoxBase
/// @notice Abstract base for all phreaking.fun Mystery Box variants. The single shared base
///         (OBS-129 build reference): every concrete box extends this and supplies only its pool
///         type and swap delegation, so the security invariants below are inherited uniformly.
///          - GUARDIAN_ROLE can pause in a single transaction (remediates OBS-128 M-4).
///          - Unpause is timelocked: guardian queues it, anyone releases after UNPAUSE_DELAY.
///          - No privileged path moves user funds; admin roles manage caps/pools/executor only.
///          - CEI order + SafeERC20 (via OZ) + ReentrancyGuard on all deposit paths.
///          - Bounded-launch caps: total value-at-risk, per-transaction and per-wallet, in USD 1e8 units.
abstract contract MysteryBoxBase is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN");

    uint256 public constant UNPAUSE_DELAY = 24 hours;

    ITokenPricer public immutable pricer;
    BoxTokenRegistry public immutable registry;
    IBoxExecutor public executor;

    uint256 public totalValueAtRiskCap;   // cumulative deposited value (USD 1e8)
    uint256 public perTransactionCap;     // single deposit cap (USD 1e8)
    uint256 public perWalletCap;          // cumulative per-wallet cap (USD 1e8)

    uint256 internal _totalValueAtRisk;   // monotonically increasing: conservative, never decreases.
    mapping(address => uint256) internal _walletDeposited;
    uint256 internal _unpauseQueuedAt;    // block.timestamp when unpause was queued (0 = not queued).

    event ExecutorChanged(address indexed executor);
    event TotalValueAtRiskCapChanged(uint256 oldCap, uint256 newCap);
    event PerTransactionCapChanged(uint256 oldCap, uint256 newCap);
    event PerWalletCapChanged(uint256 oldCap, uint256 newCap);
    event UnpauseQueued(uint256 releaseAt);
    event UnpauseReleased(uint256 queuedAt);
    event DepositReceived(address indexed user, address indexed token, uint256 amount);
    event UnpauseCancelled(uint256 queuedAt);

    /// @param _registry Shared BoxTokenRegistry. Immutable: pool management lives there, not here.
    /// @param _pricer USD price feed (1e8). Immutable for the life of this contract.
    /// @param _admin Initial DEFAULT_ADMIN_ROLE holder (deployer multisig).
    constructor(BoxTokenRegistry _registry, ITokenPricer _pricer, address _admin ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        registry = _registry;
        pricer = _pricer;
        // Guardian role is assigned by the admin via grantRole after deploy.
        _setRoleAdmin(GUARDIAN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @notice Current USD price of one whole `token` (1e8). Reverts if unusable in this box's pool.
    function usdValue(address token) public view returns (uint256) {
        require(registry.canUse(token, boxType()), "MysteryBoxBase: token not usable");
        return pricer.price(token); // whole-token USD at 1e8
    }

    /// @notice USD value of `amount` units of `token` (1e8). Reverts if unusable in this box's pool.
    function valueOf(address token, uint256 amount) public view returns (uint256) {
        require(registry.canUse(token, boxType()), "MysteryBoxBase: token not usable");
        uint8 decimals_ = registry.decimalsOf(token);
        // whole-value(1e8) * amount / 10**decimals = USD of `amount` units at 1e8.
        return pricer.price(token) * amount / (10 ** uint256(decimals_));
    }

    /// @notice Pause all box activity immediately. Callable by any GUARDIAN_ROLE holder in one tx.
    ///         Also cancels a queued unpause so a later incident cannot be lifted by a stale timer.
    ///         Re-pausing while already paused is allowed: that is how a guardian invalidates a pending lift.
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _cancelQueuedUnpause();
        if (!paused()) _pause();
    }

    /// @notice Queue an unpause that becomes effective UNPAUSE_DELAY later (timelocked unpause invariant).
    function queueUnpause() external onlyRole(GUARDIAN_ROLE) {
        require(_unpauseQueuedAt == 0, "MysteryBoxBase: already queued");
        _unpauseQueuedAt = block.timestamp;
        emit UnpauseQueued(block.timestamp + UNPAUSE_DELAY);
    }

    /// @notice Release a queued unpause after the delay has elapsed. Permissionless by design: an
    ///         emergency pause can only be lifted on schedule, not instantly.
    function releaseUnpause() external {
        require(_unpauseQueuedAt != 0, "MysteryBoxBase: nothing queued");
        require(block.timestamp >= _unpauseQueuedAt + UNPAUSE_DELAY, "MysteryBoxBase: timelock not elapsed");
        uint256 queuedAt = _unpauseQueuedAt;
        _unpauseQueuedAt = 0; // effects before interaction (CEI)
        _unpause();
        emit UnpauseReleased(queuedAt);
    }

    function unpauseReleaseAt() external view returns (uint256) {
        return _unpauseQueuedAt == 0 ? 0 : _unpauseQueuedAt + UNPAUSE_DELAY;
    }

    /// @dev Drop a pending unpause so releaseUnpause cannot fire against a newer pause.
    function _cancelQueuedUnpause() internal {
        uint256 queuedAt = _unpauseQueuedAt;
        if (queuedAt == 0) return;
        _unpauseQueuedAt = 0;
        emit UnpauseCancelled(queuedAt);
    }

    // ---- admin configuration (no fund-movement surface) -------------------------

    function setExecutor(address newExecutor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newExecutor != address(0), "MysteryBoxBase: zero executor");
        IBoxExecutor old = executor;
        executor = IBoxExecutor(newExecutor); // effects before any use (CEI)
        emit ExecutorChanged(address(old));
    }

    function setTotalValueAtRiskCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 old = totalValueAtRiskCap;
        totalValueAtRiskCap = newCap; // staged increases are a governance procedure, not enforced on-chain.
        emit TotalValueAtRiskCapChanged(old, newCap);
    }

    function setPerTransactionCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 old = perTransactionCap;
        perTransactionCap = newCap;
        emit PerTransactionCapChanged(old, newCap);
    }

    function setPerWalletCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 old = perWalletCap;
        perWalletCap = newCap;
        emit PerWalletCapChanged(old, newCap);
    }

    // ---- deposit pipeline ---------------------------------------------------------

    /// @notice Deposit `amount` of whitelisted `tokenIn` and run this box's swap. NonReentrant + paused gate.
    ///         `tokenIn == address(0)` denotes native Ether (zero-address convention, OBS-128 H-1 donation
    ///         path): msg.value must equal amount exactly. Bare transfers are intentionally NOT accepted —
    ///         no catch-all receive() exists, so native ETH can never sit in the contract unattributed;
    ///         every unit passes cap accounting and emits DepositReceived before delegation.
    function deposit(uint256 amount, address tokenIn) public payable nonReentrant whenNotPaused returns (address tokenOut) {
        require(amount > 0, "MysteryBoxBase: zero amount");
        _checkDepositCaps(msg.sender, tokenIn, amount);

        // Effects before interaction.
        uint256 value = valueOf(tokenIn, amount);
        _totalValueAtRisk += value;
        _walletDeposited[msg.sender] += value;
        emit DepositReceived(msg.sender, tokenIn, amount);

        if (tokenIn == address(0)) {
            require(msg.value == amount, "MysteryBoxBase: msg.value mismatch");
        } else {
            require(msg.value == 0, "MysteryBoxBase: unexpected value");
            IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amount);
        }

        // Snapshot before the swap. msg.value is already in address(this).balance, and an
        // internal _executeSwap still sees the original msg.value, so a post-call delta of
        // `amount` is exactly "the executor took this deposit".
        uint256 balanceBefore = address(this).balance;
        tokenOut = _executeSwap(msg.sender, tokenIn, amount, value);
        if (tokenIn == address(0)) {
            require(balanceBefore >= amount, "MysteryBoxBase: native missing");
            require(balanceBefore - address(this).balance == amount, "MysteryBoxBase: native not forwarded");
        } else {
            require(address(this).balance == balanceBefore, "MysteryBoxBase: unexpected value retained");
        }
    }

    /// @dev Enforce total value-at-risk, per-transaction and per-wallet caps (bounded-launch controls).
    function _checkDepositCaps(address user, address token, uint256 amount) internal view {
        require(registry.canUse(token, boxType()), "MysteryBoxBase: token not usable in pool");
        uint256 value = valueOf(token, amount);
        if (perTransactionCap != 0) require(value <= perTransactionCap, "MysteryBoxBase: tx cap exceeded");
        if (totalValueAtRiskCap != 0) {
            require(_totalValueAtRisk + value <= totalValueAtRiskCap, "MysteryBoxBase: total VaR cap reached");
        }
        if (perWalletCap != 0) {
            require(_walletDeposited[user] + value <= perWalletCap, "MysteryBoxBase: wallet cap exceeded");
        }
    }

    /// @dev Each variant declares its registry pool.
    function boxType() public pure virtual returns (BoxTokenRegistry.BoxType);

    /// @dev Variants implement their swap rule and return the output token address. `valueUsd1e8` is the
    ///      deposit-time USD value passed so the executor can enforce slippage/criteria. Native deposits
    ///      must forward `msg.value` to the executor in the same call; `deposit` then requires a zero balance.
    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8)
        internal
        virtual
        returns (address tokenOut);

    /// @notice Cumulative deposited value across all users (USD 1e8). Monotonic by design.
    function totalValueAtRisk() external view returns (uint256) {
        return _totalValueAtRisk;
    }

    /// @notice Cumulative deposited value for `user` (USD 1e8).
    function walletDeposited(address user) public view returns (uint256) {
        return _walletDeposited[user];
    }
}
