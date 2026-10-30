// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {ITokenPricer} from "../src/interfaces/ITokenPricer.sol";
import {IBoxExecutor} from "../src/interfaces/IBoxExecutor.sol";

contract MockExecutor is IBoxExecutor {
    address public tokenOut;
    function setOutput(address _t) external { tokenOut = _t; }
    function execute(address, address, address, uint256, uint256) external returns (address) { return tokenOut; }
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
    MockExecutor executor;
    MysteryBox box;
    address admin = address(0xAA);
    address guardian = address(0xBB);
    address user = address(0xCC);
    address tokenIn;

    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f; // AccessControlUnauthorizedAccount(address,bytes32)

    function setUp() external virtual {
        registry = new BoxTokenRegistry(admin);
        pricer = new TokenPricer(admin);
        executor = new MockExecutor();
        box = new MysteryBox(registry, pricer, admin);
        tokenIn = address(new MockToken());

        vm.startPrank(admin);
        box.grantRole(box.GUARDIAN_ROLE(), guardian);
        box.setExecutor(address(executor));
        registry.registerToken(tokenIn, 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, tokenIn, true);
        pricer.setPrice(tokenIn, 2000 * 1e8, 18);
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
}
