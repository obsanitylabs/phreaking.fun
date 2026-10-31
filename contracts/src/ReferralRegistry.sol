// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {ReferralToken} from "./ReferralToken.sol";

/// @title ReferralRegistry
/// @notice Product one-pager §1 "Referrals": each referred user credits their uplink (referrer) with one free
///         Red Box swap, delivered as a whole ReferralToken (pegged 1:1 to MATIC in the private pool). This
///         contract records referrals, mints the reward once per referee, and authorizes redemption of that
///         reward for a free swap. Settlement of the actual swap is delegated off-chain via IBoxExecutor, so no
///         user funds ever sit here — only reward-token accounting (pull-over-push invariant).
///          - GUARDIAN_ROLE can pause in one tx; unpause is timelocked UNPAUSE_DELAY (same as MysteryBoxBase).
///          - No self-referral; each referee registers exactly once (blocks farming / double minting).
///          - maxSupply on ReferralToken hard-caps total program exposure; optional per-referrer cap adds depth.
contract ReferralRegistry is AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN");

    uint256 public constant UNPAUSE_DELAY = 24 hours;
    uint256 public constant REWARD_PER_REFERRAL = 1 ether; // one whole ReferralToken == one free Red Box swap.

    ReferralToken public immutable rewardToken;

    mapping(address referee => bool) private _registered;     // each new user claims a referral exactly once.
    mapping(address upline => uint256) private _referralCount; // lifetime rewards credited per referrer (uplink).
    uint256 private _unpauseQueuedAt;                          // 0 = not queued.

    /// @notice Per-referrer lifetime reward cap (whole tokens; each referral credits exactly one, so this also
    ///         bounds the number of referees an uplink can credit). 0 = unlimited. Defense-in-depth against one
    ///         address registering many fake referees to farm the immutable supply cap.
    uint256 public maxRewardsPerReferrer;

    event ReferralRegistered(address indexed referee, address indexed upline);
    event FreeSwapGranted(address indexed referrer, address indexed tokenOut);
    event MaxRewardsPerReferrerChanged(uint256 oldCap, uint256 newCap);
    event UnpauseQueued(uint256 releaseAt);
    event UnpauseReleased(uint256 queuedAt);

    /// @param _rewardToken The ReferralToken contract (immutable). Deployer must grant it MINTER_ROLE here.
    /// @param _admin Initial DEFAULT_ADMIN_ROLE holder (deployer multisig).
    constructor(ReferralToken _rewardToken, address _admin) {
        require(address(_rewardToken) != address(0), "ReferralRegistry: zero token");
        rewardToken = _rewardToken;
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _setRoleAdmin(GUARDIAN_ROLE, DEFAULT_ADMIN_ROLE);
    }

    // ---- referral + redemption ----------------------------------------------------

    /// @notice Called by a new user (the referee) to record that `upline` referred them. Credits `upline` with
    ///         one whole ReferralToken (one free Red Box swap). Each referee may do this exactly once.
    function register(address upline) external nonReentrant whenNotPaused {
        require(upline != address(0), "ReferralRegistry: zero upline");
        require(msg.sender != upline, "ReferralRegistry: self-referral");
        require(!_registered[msg.sender], "ReferralRegistry: already registered");

        uint256 cap = maxRewardsPerReferrer;
        if (cap != 0) {
            require(_referralCount[upline] < cap, "ReferralRegistry: referrer reward cap reached");
        }

        // Effects before interaction (CEI).
        _registered[msg.sender] = true;
        _referralCount[upline] += 1;

        rewardToken.mint(upline, REWARD_PER_REFERRAL); // interaction last.

        emit ReferralRegistered(msg.sender, upline);
    }

    /// @notice Redeem one whole ReferralToken held by `msg.sender` for a free Red Box swap of `tokenOut`. The
    ///         token is burned on-chain; the actual 1:1 swap (worth 1 MATIC) is settled off-chain via IBoxExecutor,
    ///         which consumes the FreeSwapGranted event. Pull-only — no privileged path moves funds here.
    function redeemFreeSwap(address tokenOut) external nonReentrant whenNotPaused {
        require(tokenOut != address(0), "ReferralRegistry: zero token");
        uint256 bal = rewardToken.balanceOf(msg.sender);
        require(bal >= REWARD_PER_REFERRAL, "ReferralRegistry: no referral tokens to redeem");

        // Effects before interaction (CEI): burn the reward first so a revert in settlement cannot double-spend.
        rewardToken.burnByMinter(msg.sender, REWARD_PER_REFERRAL);

        emit FreeSwapGranted(msg.sender, tokenOut);
    }

    /// @notice Cumulative referrals credited to `upline` (lifetime). Exposed for the off-chain system + audits.
    function referralsOf(address upline) external view returns (uint256) {
        return _referralCount[upline];
    }

    // ---- admin configuration ------------------------------------------------------

    /// @notice Set per-referrer lifetime reward cap (whole tokens). 0 = unlimited. No fund-movement surface.
    function setMaxRewardsPerReferrer(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 old = maxRewardsPerReferrer;
        maxRewardsPerReferrer = newCap;
        emit MaxRewardsPerReferrerChanged(old, newCap);
    }

    // ---- guardian pause controls (mirrors MysteryBoxBase) -------------------------

    /// @notice Pause all referral/redemption activity immediately. Callable by any GUARDIAN_ROLE in one tx.
    function pause() external onlyRole(GUARDIAN_ROLE) {
        _pause();
    }

    /// @notice Queue an unpause effective UNPAUSE_DELAY later (timelocked unpause invariant).
    /// @dev    Only queueable while paused so a stale queue can never outlive a later emergency pause
    ///         (same remediation as MysteryBoxBase).
    function queueUnpause() external onlyRole(GUARDIAN_ROLE) whenPaused {
        require(_unpauseQueuedAt == 0, "ReferralRegistry: already queued");
        _unpauseQueuedAt = block.timestamp;
        emit UnpauseQueued(block.timestamp + UNPAUSE_DELAY);
    }

    /// @notice Release a queued unpause after the delay. Permissionless: an emergency pause lifts on schedule only.
    function releaseUnpause() external {
        require(_unpauseQueuedAt != 0, "ReferralRegistry: nothing queued");
        require(block.timestamp >= _unpauseQueuedAt + UNPAUSE_DELAY, "ReferralRegistry: timelock not elapsed");
        uint256 queuedAt = _unpauseQueuedAt;
        _unpauseQueuedAt = 0; // effects before interaction (CEI)
        _unpause();
        emit UnpauseReleased(queuedAt);
    }

    function unpauseReleaseAt() external view returns (uint256) {
        return _unpauseQueuedAt == 0 ? 0 : _unpauseQueuedAt + UNPAUSE_DELAY;
    }
}
