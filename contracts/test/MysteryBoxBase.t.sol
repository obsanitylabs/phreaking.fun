// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {MysteryBoxBase} from "../src/MysteryBoxBase.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {ITokenPricer} from "../src/interfaces/ITokenPricer.sol";
import {DualQuote} from "./PriceSources.sol";
import {IBoxExecutor} from "../src/interfaces/IBoxExecutor.sol";
import {WhiteBox} from "../src/WhiteBox.sol";

/// @dev Variant that forgets to forward native value. deposit() must revert so ETH cannot stick.
contract NonForwardingBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.MYSTERY;
    }

    function _executeSwap(address, address, uint256, uint256) internal pure override returns (address tokenOut) {
        return address(0xDD);
    }
}

contract MockExecutor is IBoxExecutor {
    address public tokenOut;
    bool public sweepNative;
    function setOutput(address _t) external { tokenOut = _t; }
    function setSweepNative(bool sweep) external { sweepNative = sweep; }
    function execute(address, address, address tokenIn, uint256 amount, uint256) external payable returns (address) {
        if (sweepNative && tokenIn == address(0)) {
            require(msg.value == amount, "executor: value mismatch");
        }
        return tokenOut;
    }
    receive() external payable {}
}

contract MockToken {
    string public name = "MOCK";
    string public symbol = "MCK";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount; return true;
    }
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "insufficient allowance");
        allowance[from][msg.sender] -= value;
        balanceOf[to] += value; return true;
    }
    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }
}

abstract contract MysteryBoxBaseTest is Test {
    BoxTokenRegistry registry;
    TokenPricer pricer;
    DualQuote quotes;
    MockExecutor executor;
    MysteryBox box;
    address admin = address(0xAA);
    address guardian = address(0xBB);
    address user = address(0xCC);
    address tokenIn;

    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f; // AccessControlUnauthorizedAccount(address,bytes32)

    function setUp() external virtual {
        registry = new BoxTokenRegistry(admin);
        quotes = new DualQuote();
        pricer = quotes.deploy(admin, admin, address(quotes));
        executor = new MockExecutor();
        box = new MysteryBox(registry, pricer, admin);
        tokenIn = address(new MockToken());

        vm.startPrank(admin);
        box.grantRole(box.GUARDIAN_ROLE(), guardian);
        box.setExecutor(address(executor));
        registry.registerToken(tokenIn, 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, tokenIn, true);
        quotes.quote(tokenIn, 2000 * 1e8, 18);
        vm.stopPrank();
    }

    function _approveAndFund(address from, uint256 amount) internal {
        MockToken(tokenIn).mint(from, amount);
        vm.prank(from);
        MockToken(tokenIn).approve(address(box), amount);
    }

    // Helper: encode AccessControlUnauthorizedAccount with caller + required role
    function _unauthorizedError(address caller, bytes32 role) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(UNAUTHORIZED_SEL, caller, role);
    }
}

contract PauseUnpauseTest is MysteryBoxBaseTest {
    function test_Pause_InOneTx() public {
        _approveAndFund(user, 1 ether);
        vm.prank(guardian);
        box.pause();
        assertTrue(box.paused());
        // OZ v5 Pausable uses custom error EnforcedPause()
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        box.deposit(1 ether, tokenIn);
    }

    function test_Unpause_Timelocked() public {
        vm.prank(guardian);
        box.pause();
        vm.prank(guardian);
        box.queueUnpause();
        uint256 releaseAt = box.unpauseReleaseAt();
        assertEq(releaseAt, block.timestamp + 24 hours);
        vm.expectRevert("MysteryBoxBase: timelock not elapsed");
        box.releaseUnpause();
        skip(24 hours);
        box.releaseUnpause();
        assertFalse(box.paused());
    }

    function test_Unpause_MustQueueFirst() public {
        vm.prank(guardian);
        box.pause();
        vm.expectRevert("MysteryBoxBase: nothing queued");
        box.releaseUnpause();
    }

    function test_Pause_CancelsQueuedUnpause() public {
        vm.prank(guardian);
        box.pause();
        vm.prank(guardian);
        box.queueUnpause();
        assertGt(box.unpauseReleaseAt(), 0);

        // A new emergency pause must invalidate the pending lift, or releaseUnpause
        // can unpause after the original delay even though the incident is still open.
        vm.prank(guardian);
        box.pause();
        assertEq(box.unpauseReleaseAt(), 0);

        skip(24 hours);
        vm.expectRevert("MysteryBoxBase: nothing queued");
        box.releaseUnpause();
        assertTrue(box.paused());
    }

    bytes32 constant GUARDIAN_ROLE = keccak256("GUARDIAN");

    function test_Pause_OnlyGuardian() public {
        vm.expectRevert(_unauthorizedError(address(this), GUARDIAN_ROLE));
        box.pause();
    }
}

contract CapsTest is MysteryBoxBaseTest {
    function test_TxCap_Enforced() public {
        vm.prank(admin);
        box.setPerTransactionCap(1000 * 1e8);
        _approveAndFund(user, 2 ether);
        vm.expectRevert("MysteryBoxBase: tx cap exceeded");
        vm.startPrank(user);
        box.deposit(2 ether, tokenIn);
        vm.stopPrank();
    }

    function test_TotalVarCap_Enforced() public {
        vm.prank(admin);
        box.setTotalValueAtRiskCap(1500 * 1e8);
        _approveAndFund(user, 1 ether);
        vm.expectRevert("MysteryBoxBase: total VaR cap reached");
        vm.prank(user);
        box.deposit(1 ether, tokenIn);
    }

    function test_WalletCap_Enforced() public {
        vm.prank(admin);
        box.setPerWalletCap(500 * 1e8);
        _approveAndFund(user, 1 ether);
        vm.expectRevert("MysteryBoxBase: wallet cap exceeded");
        vm.prank(user);
        box.deposit(1 ether, tokenIn);
    }

    function test_Deposit_UnderCaps() public {
        executor.setOutput(address(0xDD));
        _approveAndFund(user, 1 ether);
        vm.prank(user);
        address out = box.deposit(1 ether, tokenIn);
        assertEq(out, address(0xDD));
        assertEq(box.totalValueAtRisk(), 2000 * 1e8);
        assertEq(box.walletDeposited(user), 2000 * 1e8);
    }

    function test_TotalVar_AccumulatesAcrossUsers() public {
        executor.setOutput(address(0xDD));
        _approveAndFund(user, 1 ether);
        vm.prank(user);
        box.deposit(1 ether, tokenIn);

        address user2 = address(0xEE);
        MockToken(tokenIn).mint(user2, 1 ether);
        vm.startPrank(user2);
        MockToken(tokenIn).approve(address(box), 1 ether);
        box.deposit(1 ether, tokenIn);
        vm.stopPrank();

        assertEq(box.totalValueAtRisk(), 4000 * 1e8);
    }
}

contract RoleGatingTest is MysteryBoxBaseTest {
    bytes32 constant DEFAULT_ADMIN = bytes32(0); // OZ AccessControl default admin role value
    bytes32 constant GUARDIAN_ROLE = keccak256("GUARDIAN");

    function test_Pause_OnlyGuardian() public {
        vm.expectRevert(_unauthorizedError(address(this), GUARDIAN_ROLE));
        box.pause();
    }

    function test_Caps_Setting_OnlyAdmin() public {
        vm.expectRevert(_unauthorizedError(address(this), DEFAULT_ADMIN));
        box.setPerTransactionCap(1e8);
        vm.expectRevert(_unauthorizedError(address(this), DEFAULT_ADMIN));
        box.setTotalValueAtRiskCap(1e8);
        vm.expectRevert(_unauthorizedError(address(this), DEFAULT_ADMIN));
        box.setPerWalletCap(1e8);
    }

    function test_Executor_Setting_OnlyAdmin() public {
        vm.expectRevert(_unauthorizedError(address(this), DEFAULT_ADMIN));
        box.setExecutor(address(this));
    }

    function test_Guardian_CannotSetCaps() public {
        vm.startPrank(guardian);
        vm.expectRevert(_unauthorizedError(guardian, DEFAULT_ADMIN));
        box.setPerTransactionCap(1e8);
        vm.stopPrank();
    }
}

contract DepositFlowTest is MysteryBoxBaseTest {
    function test_Deposit_RequiresApproval() public {
        MockToken(tokenIn).mint(user, 1 ether);
        vm.expectRevert("insufficient allowance");
        vm.prank(user);
        box.deposit(1 ether, tokenIn);
    }

    function test_Deposit_ZeroAmount_Reverts() public {
        _approveAndFund(user, 1 ether);
        vm.expectRevert("MysteryBoxBase: zero amount");
        vm.prank(user);
        box.deposit(0, tokenIn);
    }

    function test_Deposit_UnusableToken_Reverts() public {
        address badToken = address(new MockToken());
        MockToken(badToken).mint(user, 1 ether);
        vm.startPrank(user);
        MockToken(badToken).approve(address(box), 1 ether);
        vm.expectRevert("MysteryBoxBase: token not usable in pool");
        box.deposit(1 ether, badToken);
        vm.stopPrank();
    }

    function test_Deposit_CallsExecutor() public {
        executor.setOutput(address(0xDD));
        _approveAndFund(user, 2 ether);
        vm.prank(user);
        address out = box.deposit(2 ether, tokenIn);
        assertEq(out, address(0xDD));
    }

    function test_Deposit_EmitsDepositReceived() public {
        executor.setOutput(address(0xDD));
        _approveAndFund(user, 1 ether);
        vm.expectEmit(true, true, false, true);
        emit MysteryBoxBase.DepositReceived(user, tokenIn, 1 ether);
        vm.prank(user);
        box.deposit(1 ether, tokenIn);
    }
}

contract NativeEtherDepositTest is MysteryBoxBaseTest {
    // OBS-128 H-1: donation paths must price and accept native Ether (zero-address convention).
    function _prepareNative() internal {
        vm.deal(user, 10 ether);
        vm.startPrank(admin);
        registry.registerToken(address(0), 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(0), true);
        quotes.quote(address(0), 2000 * 1e8, 18); // $2000/whole ETH — symmetric with tokenIn for cap tests.
        vm.stopPrank();
    }

    function test_NativeEth_Deposit_Succeeds() public {
        _prepareNative();
        executor.setOutput(address(0xDD));
        executor.setSweepNative(true);
        vm.prank(user);
        address out = box.deposit{value: 1 ether}(1 ether, address(0));
        assertEq(out, address(0xDD));
        assertEq(address(box).balance, 0);
        assertEq(box.totalValueAtRisk(), 2000 * 1e8);
        assertEq(box.walletDeposited(user), 2000 * 1e8);
    }

    function test_NativeEth_MsgValueMismatch_Reverts() public {
        _prepareNative();
        vm.prank(user);
        vm.expectRevert("MysteryBoxBase: msg.value mismatch");
        box.deposit{value: 0.5 ether}(1 ether, address(0)); // too little
        vm.prank(user);
        vm.expectRevert("MysteryBoxBase: msg.value mismatch");
        box.deposit{value: 2 ether}(1 ether, address(0)); // excess rejected — no unaccounted surplus
    }

    function test_NativeEth_TxCap_Enforced() public {
        _prepareNative();
        vm.prank(admin);
        box.setPerTransactionCap(1000 * 1e8); // $1000 < value of 1 ETH ($2000)
        vm.expectRevert("MysteryBoxBase: tx cap exceeded");
        vm.prank(user);
        box.deposit{value: 1 ether}(1 ether, address(0));
    }

    function test_NativeEth_StrandedIfNotForwarded_Reverts() public {
        // A variant that returns an output token but never sends msg.value onward must not
        // complete the deposit. The revert rolls the ETH and the cap accounting back.
        _prepareNative();
        NonForwardingBox stuck = new NonForwardingBox(registry, pricer, admin);
        vm.prank(user);
        vm.expectRevert("MysteryBoxBase: native not forwarded");
        stuck.deposit{value: 1 ether}(1 ether, address(0));
        assertEq(address(stuck).balance, 0);
        assertEq(stuck.totalValueAtRisk(), 0);
    }

    function test_NativeEth_ExecutorSweep_Succeeds() public {
        _prepareNative();
        executor.setOutput(address(0xDD));
        executor.setSweepNative(true);
        vm.prank(user);
        address out = box.deposit{value: 1 ether}(1 ether, address(0));
        assertEq(out, address(0xDD));
        assertEq(address(box).balance, 0);
        assertEq(box.totalValueAtRisk(), 2000 * 1e8);
    }

    function test_Erc20Deposit_RejectsAttachedValue() public {
        executor.setOutput(address(0xDD));
        _approveAndFund(user, 1 ether);
        vm.deal(user, 1 ether);
        vm.prank(user);
        vm.expectRevert("MysteryBoxBase: unexpected value");
        box.deposit{value: 1 ether}(1 ether, tokenIn);
    }

    function test_NativeEth_BareTransfer_NotAccepted() public {
        // No catch-all receive(): unattributed native ETH is rejected at the EVM level (H-1 stranding fix).
        vm.expectRevert();
        address(box).call{value: 1 ether}("");
    }

    function test_NativeEth_Paused_Blocked() public {
        _prepareNative();
        vm.prank(guardian);
        box.pause();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(user);
        box.deposit{value: 1 ether}(1 ether, address(0));
    }

    function test_WhiteBox_Donate_Alias_NativeAndErc20() public {
        _prepareNative();
        WhiteBox white = new WhiteBox(registry, pricer, admin);
        vm.startPrank(admin);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.WHITE, address(0), true);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.WHITE, tokenIn, true);
        white.grantRole(white.GUARDIAN_ROLE(), guardian);
        white.setExecutor(address(executor));
        vm.stopPrank();

        executor.setOutput(address(0xEE));
        executor.setSweepNative(true);
        vm.prank(user);
        address out = white.donate{value: 1 ether}(1 ether, address(0)); // native ETH donation
        assertEq(out, address(0xEE));
        assertEq(white.totalValueAtRisk(), 2000 * 1e8);

        MockToken(tokenIn).mint(user, 1 ether); // ERC20 donation through the same entry point.
        vm.startPrank(user);
        MockToken(tokenIn).approve(address(white), 1 ether);
        white.donate(1 ether, tokenIn);
        vm.stopPrank();
        assertEq(white.totalValueAtRisk(), 4000 * 1e8);

        // Donation path is pauseable like every fund path (M-2).
        vm.prank(guardian);
        white.pause();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(user);
        white.donate{value: 1 ether}(1 ether, address(0));
    }
}
