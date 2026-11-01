// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {TestnetSettlingExecutor} from "../src/TestnetSettlingExecutor.sol";
import {IBoxExecutor} from "obs/interfaces/IBoxExecutor.sol";
import {MysteryBox} from "obs/MysteryBox.sol";
import {MysteryBoxBase} from "obs/MysteryBoxBase.sol";
import {BoxTokenRegistry} from "obs/BoxTokenRegistry.sol";
import {TokenPricer} from "obs/TokenPricer.sol";
import {RolePriceSource} from "obs/RolePriceSource.sol";

/// @dev Two independent keepers that publish the same quote (inlined so this addendum is self-contained,
///      mirroring the fleet's test/PriceSources.sol helper used by AttackSim.t.sol).
contract DualQuote {
    TokenPricer public pricer;
    RolePriceSource public primary;
    RolePriceSource public secondary;

    function deploy(address admin, address keeperA, address keeperB) external returns (TokenPricer) {
        primary = new RolePriceSource(address(this));
        secondary = new RolePriceSource(address(this));
        pricer = new TokenPricer(admin, primary, secondary);
        primary.grantRole(primary.KEEPER_ROLE(), keeperA);
        secondary.grantRole(secondary.KEEPER_ROLE(), keeperB);
        primary.grantRole(primary.KEEPER_ROLE(), address(this));
        secondary.grantRole(secondary.KEEPER_ROLE(), address(this));
        primary.grantRole(primary.DEFAULT_ADMIN_ROLE(), admin);
        secondary.grantRole(secondary.DEFAULT_ADMIN_ROLE(), admin);
        return pricer;
    }

    function quote(address token, uint256 priceUSDPerWhole, uint8 decimals_) external {
        primary.setQuote(token, priceUSDPerWhole, decimals_);
        secondary.setQuote(token, priceUSDPerWhole, decimals_);
    }
}

/// @dev Minimal ERC20 used to drive the box deposit pipeline (same shape as AttackSim's AttackToken).
contract TestToken {
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external virtual returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "insufficient allowance");
        allowance[from][msg.sender] = a - amount;
        _move(from, to, amount);
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}

/// @dev ERC20 whose `transferFrom` calls back into an arbitrary target. The executor pulls the box's
///      deposit via `transferFrom`, so this models a malicious token re-entering the box mid-deposit.
contract ReentrantTestToken is TestToken {
    address public target;
    bytes public payload;

    function arm(address t, bytes calldata p) external {
        target = t;
        payload = p;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "insufficient allowance");
        allowance[from][msg.sender] = a - amount;
        _move(from, to, amount);
        if (target != address(0)) {
            (bool ok, bytes memory ret) = target.call(payload);
            if (!ok) {
                assembly {
                    revert(add(ret, 0x20), mload(ret))
                }
            }
        }
        return true;
    }
}

/// @dev Executor that returns the zero address and never pulls — the S7c zero-output case.
contract ZeroOutputExecutor is IBoxExecutor {
    function execute(address, address, address, uint256, uint256) external payable returns (address) {
        return address(0);
    }
}

/// @dev Executor that tries to re-enter the box while the outer deposit is mid-flight (S2).
contract ReentrantExecutor is IBoxExecutor {
    MysteryBox public box;

    function arm(MysteryBox b) external {
        box = b;
    }

    receive() external payable {}

    function execute(address, address, address tokenIn, uint256 amount, uint256) external payable returns (address) {
        MysteryBoxBase(address(box)).deposit(amount, tokenIn);
        return address(0xDEAD);
    }
}

/// @notice Exercises TestnetSettlingExecutor against the real IBoxExecutor obligations using the fleet's
///         own MysteryBox pipeline (mirrors test/AttackSim.t.sol semantics for S2/S3/S7c).
contract TestnetSettlingExecutorTest is Test {
    TestnetSettlingExecutor executor;
    BoxTokenRegistry registry;
    TokenPricer pricer;
    DualQuote dual;
    MysteryBox box;
    TestToken token;

    address admin = address(0xA11CE);
    address user = address(0xB0B);
    address multisig = address(0x5AFE);

    string internal constant REENTRANCY = "ReentrancyGuardReentrantCall()";

    function setUp() external {
        dual = new DualQuote();
        registry = new BoxTokenRegistry(admin);
        pricer = dual.deploy(admin, address(0xEEEEEE11), address(0xEEEEEE22));
        executor = new TestnetSettlingExecutor();
        box = new MysteryBox(registry, pricer, admin);
        token = new TestToken();

        vm.startPrank(admin);
        box.setExecutor(address(executor));
        registry.registerToken(address(token), 18);
        registry.registerToken(address(0), 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(token), true);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(0), true);
        vm.stopPrank();
        dual.quote(address(token), 2000 * 1e8, 18);
        dual.quote(address(0), 2000 * 1e8, 18);
    }

    function _fundUser(uint256 amount) internal {
        token.mint(user, amount);
        vm.prank(user);
        token.approve(address(box), amount);
    }

    // ---- ERC20 pull model (S3) ----------------------------------------------------------

    /// The pull happens inside the box's one-shot allowance, the box's allowance is reset to zero, and
    /// the executor takes custody of exactly `amount`. The returned tokenOut is non-zero.
    function test_Erc20Deposit_PullsInsideOneShotAllowance_SettlesNonZero() public {
        _fundUser(1 ether);

        vm.prank(user);
        address out = box.deposit(1 ether, address(token));

        assertEq(token.balanceOf(address(executor)), 1 ether, "executor must hold exactly the deposit");
        assertEq(token.balanceOf(address(box)), 0, "box must not retain the deposit");
        assertEq(token.allowance(address(box), address(executor)), 0, "standing allowance left behind");
        assertEq(out, address(token), "tokenOut must be the non-zero input token");
        assertTrue(out != address(0), "boxes revert on a zero output (S7c)");
    }

    /// No standing allowance exists between deposits: a second pull with no fresh allowance reverts.
    function test_Erc20Execute_NoStandingAllowance_SecondPullReverts() public {
        _fundUser(1 ether);
        vm.prank(user);
        box.deposit(1 ether, address(token));

        vm.expectRevert("insufficient allowance");
        executor.execute(user, address(box), address(token), 1 ether, 0);
    }

    // ---- native path --------------------------------------------------------------------

    /// Native deposits arrive as `msg.value == amount` and are accepted (and custodied).
    function test_NativeExecute_AcceptsExactValue() public {
        vm.deal(user, 1 ether);

        vm.prank(user);
        address out = executor.execute{value: 1 ether}(user, address(box), address(0), 1 ether, 0);

        assertEq(address(executor).balance, 1 ether, "executor must custody the native deposit");
        assertEq(out, address(0), "native path returns tokenIn (zero-address convention)");
    }

    function test_NativeExecute_WrongValue_Reverts() public {
        vm.deal(user, 1 ether);
        vm.expectRevert("TestnetSettling: wrong native value");
        vm.prank(user);
        executor.execute{value: 0.5 ether}(user, address(box), address(0), 1 ether, 0);
    }

    function test_Erc20Execute_WithNativeValue_Reverts() public {
        vm.deal(user, 1 ether);
        vm.expectRevert("TestnetSettling: unexpected native value");
        vm.prank(user);
        executor.execute{value: 1 ether}(user, address(box), address(token), 1 ether, 0);
    }

    // ---- zero output cannot escape (S7c) ------------------------------------------------

    /// A zero-returning executor is rejected by the box: the deposit rolls back, nothing is stranded.
    function test_ZeroOutputExecutor_Deposit_Reverts_NothingStranded() public {
        ZeroOutputExecutor z = new ZeroOutputExecutor();
        vm.prank(admin);
        box.setExecutor(address(z));

        _fundUser(1 ether);
        vm.expectRevert("MysteryBox: no output token returned");
        vm.prank(user);
        box.deposit(1 ether, address(token));

        assertEq(token.balanceOf(user), 1 ether, "user keeps their funds");
        assertEq(token.balanceOf(address(box)), 0, "box retains nothing");
    }

    /// By design the settlement sink returns `tokenIn`, so the native path yields a zero output and the
    /// box's guard blocks it (funds roll back). Documented so no one assumes native settlement works.
    function test_NativeDeposit_ThroughBox_ZeroOutput_BlockedByGuard() public {
        vm.deal(user, 1 ether);
        vm.expectRevert("MysteryBox: no output token returned");
        vm.prank(user);
        box.deposit{value: 1 ether}(1 ether, address(0));
    }

    // ---- reentrancy / callback ----------------------------------------------------------

    /// A malformed token that re-enters `box.deposit` during the executor's pull cannot create a
    /// second deposit-in-deposit: ReentrancyGuard reverts the whole tx.
    function test_ReentrantToken_CannotCreateSecondDeposit() public {
        ReentrantTestToken rt = new ReentrantTestToken();
        vm.prank(admin);
        registry.registerToken(address(rt), 18);
        vm.prank(admin);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(rt), true);
        dual.quote(address(rt), 2000 * 1e8, 18);

        rt.mint(user, 1 ether);
        vm.prank(user);
        rt.approve(address(box), 1 ether);
        rt.arm(address(box), abi.encodeWithSelector(box.deposit.selector, uint256(1 ether), address(rt)));

        vm.expectRevert(abi.encodeWithSignature(REENTRANCY));
        vm.prank(user);
        box.deposit(1 ether, address(rt));

        assertEq(rt.balanceOf(user), 1 ether, "no deposit state survived the revert");
    }

    /// A malicious executor that re-enters the box during settlement is blocked by ReentrancyGuard.
    function test_ReentrantExecutor_CannotCreateSecondDeposit() public {
        ReentrantExecutor re = new ReentrantExecutor();
        re.arm(box);
        vm.prank(admin);
        box.setExecutor(address(re));

        _fundUser(1 ether);
        vm.expectRevert(abi.encodeWithSignature(REENTRANCY));
        vm.prank(user);
        box.deposit(1 ether, address(token));
    }

    // ---- sweep (custody escape hatch) ---------------------------------------------------

    function test_Sweep_Erc20_OnlyOwner_MovesFunds() public {
        _fundUser(1 ether);
        vm.prank(user);
        box.deposit(1 ether, address(token));

        vm.expectRevert(TestnetSettlingExecutor.NotOwner.selector);
        vm.prank(user);
        executor.sweep(address(token), multisig, 1 ether);

        executor.sweep(address(token), multisig, 1 ether); // test contract == deployer == owner
        assertEq(token.balanceOf(multisig), 1 ether, "swept ERC20 reaches the multisig");
        assertEq(token.balanceOf(address(executor)), 0, "executor drained");
    }

    function test_Sweep_Native_OnlyOwner() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        executor.execute{value: 1 ether}(user, address(box), address(0), 1 ether, 0);

        vm.expectRevert(TestnetSettlingExecutor.NotOwner.selector);
        vm.prank(user);
        executor.sweep(address(0), multisig, 1 ether);

        executor.sweep(address(0), multisig, 1 ether);
        assertEq(multisig.balance, 1 ether, "swept native reaches the multisig");
    }
}
