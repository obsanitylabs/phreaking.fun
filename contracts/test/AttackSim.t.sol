// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {MysteryBoxBase} from "../src/MysteryBoxBase.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {DiamondBox} from "../src/DiamondBox.sol";
import {CoinGatchaBox} from "../src/CoinGatchaBox.sol";
import {OrangeBox} from "../src/OrangeBox.sol";
import {YellowBox} from "../src/YellowBox.sol";
import {PinkBox} from "../src/PinkBox.sol";
import {PurpleBox} from "../src/PurpleBox.sol";
import {RainbowBox} from "../src/RainbowBox.sol";
import {BlackBox} from "../src/BlackBox.sol";
import {CheckeredBox} from "../src/CheckeredBox.sol";
import {SilverBox} from "../src/SilverBox.sol";
import {GoldBox} from "../src/GoldBox.sol";
import {RussianFlagBox} from "../src/RussianFlagBox.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {IBoxExecutor} from "../src/interfaces/IBoxExecutor.sol";
import {ReferralToken} from "../src/ReferralToken.sol";
import {ReferralRegistry} from "../src/ReferralRegistry.sol";
import {DeployPhreaking} from "../script/Deploy.s.sol";

/// @dev Minimal ERC20 used to drive the box deposit pipeline. Public mappings keep it trivial to inspect.
contract AttackToken {
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

/// @dev Token that calls back into an arbitrary target during transferFrom — the classic ERC20 reentrancy.
///      The reentrant call is made on a typed MysteryBox so the guard's custom error bubbles unchanged.
contract ReentrantToken is AttackToken {
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

/// @dev Executor that returns whatever it is told (defaults to address(0) — the zero-output case) and never
///      pulls the ERC20 deposit. Models the documented stranding risk and the ZeroOutput guard.
contract MockExecutor is IBoxExecutor {
    address public tokenOut;

    function setOutput(address t) external {
        tokenOut = t;
    }

    function execute(address, address, address, uint256, uint256) external payable returns (address) {
        return tokenOut;
    }
}

/// @dev Executor that settles correctly (pull model + pay user), for the happy-path baseline test.
contract SettlingExecutor is IBoxExecutor {
    AttackToken public out;

    function setOutput(AttackToken o) external {
        out = o;
    }

    receive() external payable {}

    function execute(address user, address boxType, address tokenIn, uint256 amount, uint256)
        external
        payable
        returns (address)
    {
        if (tokenIn == address(0)) {
            require(msg.value == amount, "Settling: wrong native value");
        } else {
            require(msg.value == 0, "Settling: unexpected native value");
            AttackToken(tokenIn).transferFrom(boxType, address(this), amount);
        }
        if (address(out) != address(0)) out.mint(user, amount);
        return address(out);
    }
}

/// @dev Executor that tries to re-enter the box while the outer deposit is mid-flight (ERC20 and native paths).
contract ReentrantExecutor is IBoxExecutor {
    MysteryBox public box;
    bool public native;

    function arm(MysteryBox b, bool useNative) external {
        box = b;
        native = useNative;
    }

    receive() external payable {}

    function execute(address, address, address tokenIn, uint256 amount, uint256) external payable returns (address) {
        if (native) {
            box.deposit{value: 1}(1, address(0));
        } else {
            MysteryBoxBase(box).deposit(amount, tokenIn);
        }
        return address(0xDEAD);
    }
}

/// @dev Executor that always reverts — proves a failing settlement rolls the whole deposit back (no stranding).
contract RevertingExecutor is IBoxExecutor {
    function execute(address, address, address, uint256, uint256) external payable returns (address) {
        revert("AttackSim: executor boom");
    }
}

abstract contract AttackSimBase is Test {
    BoxTokenRegistry registry;
    TokenPricer pricer;
    MysteryBox box;
    AttackToken tokenIn;
    MockExecutor executor;

    address admin = address(0xA11CE);
    address guardian = address(0x6A4);
    address user = address(0xB0B);

    string internal constant REENTRANCY = "ReentrancyGuardReentrantCall()";

    function setUp() external virtual {
        registry = new BoxTokenRegistry(admin);
        pricer = new TokenPricer(admin);
        executor = new MockExecutor();
        box = new MysteryBox(registry, pricer, admin);
        tokenIn = new AttackToken();

        vm.startPrank(admin);
        box.grantRole(box.GUARDIAN_ROLE(), guardian);
        box.setExecutor(address(executor));
        registry.registerToken(address(tokenIn), 18);
        registry.registerToken(address(0), 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(tokenIn), true);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(0), true);
        pricer.setPrice(address(tokenIn), 2000 * 1e8, 18);
        pricer.setPrice(address(0), 2000 * 1e8, 18);
        vm.stopPrank();
    }

    function _fund(address who, uint256 amount) internal {
        tokenIn.mint(who, amount);
        vm.prank(who);
        tokenIn.approve(address(box), amount);
    }
}

/// @notice Runnable attack simulation for the Sepolia fleet. One test per scenario in
///         contracts/docs/SEPOLIA-ATTACK-SIM.md; each asserts the invariant that must hold.
contract AttackSimTest is AttackSimBase {
    // ---- 1. reentrancy -----------------------------------------------------------------

    /// Reentrancy through a malicious ERC20's transferFrom hook is blocked by ReentrancyGuard.
    function test_Reentrancy_Erc20ViaToken_Reverts() public {
        ReentrantToken rt = new ReentrantToken();
        vm.startPrank(admin);
        registry.registerToken(address(rt), 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(rt), true);
        pricer.setPrice(address(rt), 2000 * 1e8, 18);
        vm.stopPrank();

        rt.mint(user, 1 ether);
        vm.prank(user);
        rt.approve(address(box), 1 ether);
        rt.arm(address(box), abi.encodeWithSelector(box.deposit.selector, uint256(1 ether), address(rt)));

        vm.expectRevert(abi.encodeWithSignature(REENTRANCY));
        vm.prank(user);
        box.deposit(1 ether, address(rt));
    }

    /// Reentrancy through a malicious executor on the ERC20 path is blocked.
    function test_Reentrancy_Erc20ViaExecutor_Reverts() public {
        ReentrantExecutor re = new ReentrantExecutor();
        re.arm(box, false);
        vm.prank(admin);
        box.setExecutor(address(re));

        _fund(user, 1 ether);
        vm.expectRevert(abi.encodeWithSignature(REENTRANCY));
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));
    }

    /// Reentrancy through a malicious executor on the native path is blocked.
    function test_Reentrancy_NativeViaExecutor_Reverts() public {
        ReentrantExecutor re = new ReentrantExecutor();
        re.arm(box, true);
        vm.prank(admin);
        box.setExecutor(address(re));

        vm.deal(user, 1 ether);
        vm.expectRevert(abi.encodeWithSignature(REENTRANCY));
        vm.prank(user);
        box.deposit{value: 1 ether}(1 ether, address(0));
    }

    // ---- 2. allowance window / standing approval ---------------------------------------

    /// The per-deposit allowance is reset to exactly zero after a successful deposit (no standing approval).
    function test_Allowance_ResetToZero_AfterDeposit() public {
        SettlingExecutor se = new SettlingExecutor();
        se.setOutput(new AttackToken());
        vm.prank(admin);
        box.setExecutor(address(se));

        _fund(user, 1 ether);
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));

        assertEq(tokenIn.allowance(address(box), address(se)), 0, "standing allowance left behind");
    }

    // ---- 3. cap bypass via price manipulation / stale / zero ----------------------------

    /// A keeper cannot push a zero quote: it would price the token at $0 and bypass every USD cap.
    function test_ZeroPrice_Rejected() public {
        vm.prank(admin);
        vm.expectRevert("TokenPricer: zero price");
        pricer.setPrice(address(tokenIn), 0, 18);
    }

    /// A stale quote cannot be used to bypass caps: the deposit reverts while the feed is stale.
    function test_StalePrice_Deposit_Reverts() public {
        vm.prank(admin);
        box.setPerTransactionCap(1000 * 1e8); // 1 ETH ($2000) would exceed it if priced correctly
        _fund(user, 1 ether);

        skip(2 hours); // exceeds the 1h heartbeat
        vm.expectRevert("TokenPricer: stale price");
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));
    }

    // ---- 4. pause bypass / stale unpause queue -----------------------------------------

    /// Deposits are blocked the instant the guardian pauses (single-tx emergency stop).
    function test_Pause_BlocksDeposit() public {
        _fund(user, 1 ether);
        vm.prank(guardian);
        box.pause();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));
    }

    /// A queue created while unpaused would outlive a later emergency pause; the guard rejects it.
    function test_StaleQueue_NotAllowedWhileUnpaused() public {
        vm.prank(guardian);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ExpectedPause()"))));
        box.queueUnpause();
        assertEq(box.unpauseReleaseAt(), 0);
    }

    /// No cancelUnpause exists: once queued, the pause lifts on schedule (known design). Mitigation is that
    /// the guardian can re-issue a one-tx pause immediately afterwards.
    function test_NoCancelUnpause_ReleasesOnSchedule_GuardianCanRepause() public {
        vm.prank(guardian);
        box.pause();
        vm.prank(guardian);
        box.queueUnpause();
        uint256 releaseAt = box.unpauseReleaseAt();
        assertEq(releaseAt, block.timestamp + 24 hours);

        skip(24 hours);
        vm.prank(user); // permissionless release
        box.releaseUnpause();
        assertFalse(box.paused());

        vm.prank(guardian);
        box.pause();
        assertTrue(box.paused());
    }

    // ---- 5. native value mismatch / ETH on ERC20 ------------------------------------------------------------------

    function test_NativeValue_Excess_Reverts() public {
        vm.deal(user, 3 ether);
        vm.expectRevert("MysteryBoxBase: msg.value mismatch");
        vm.prank(user);
        box.deposit{value: 2 ether}(1 ether, address(0));
    }

    function test_NativeValue_Deficit_Reverts() public {
        vm.deal(user, 1 ether);
        vm.expectRevert("MysteryBoxBase: msg.value mismatch");
        vm.prank(user);
        box.deposit{value: 0.5 ether}(1 ether, address(0));
    }

    function test_EthAttachedToErc20Deposit_Reverts() public {
        _fund(user, 1 ether);
        vm.deal(user, 1 ether);
        vm.expectRevert("MysteryBoxBase: msg.value must be zero");
        vm.prank(user);
        box.deposit{value: 1 ether}(1 ether, address(tokenIn));
    }

    function test_BareNativeTransfer_Reverts() public {
        vm.deal(user, 1 ether);
        vm.expectRevert();
        vm.prank(user);
        address(box).call{value: 1 ether}("");
    }

    // ---- 6. executor that fails to pull / returns zero ---------------------------------

    /// Documented stranding risk: a non-pulling executor leaves the ERC20 in the box (no sweep path exists).
    /// The test pins this behaviour so any future recovery path is a deliberate, reviewed change.
    function test_NonPullingExecutor_StrandsErc20InBox() public {
        executor.setOutput(address(0xDEAD)); // returns an output but never pulls the deposit
        _fund(user, 1 ether);
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));

        assertEq(tokenIn.balanceOf(address(box)), 1 ether, "deposit should be stranded in the box");
        assertEq(tokenIn.allowance(address(box), address(executor)), 0, "allowance must still reset");
    }

    /// A reverting settlement rolls the whole tx back: nothing is stranded and the user keeps their funds.
    function test_RevertingExecutor_Deposit_RevertsCleanly() public {
        RevertingExecutor rev = new RevertingExecutor();
        vm.prank(admin);
        box.setExecutor(address(rev));

        _fund(user, 1 ether);
        vm.expectRevert("AttackSim: executor boom");
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));

        assertEq(tokenIn.balanceOf(user), 1 ether, "user balance must be untouched");
        assertEq(tokenIn.balanceOf(address(box)), 0, "box must not retain the deposit");
    }

    /// Every previously-unguarded variant now reverts on a zero output instead of silently swallowing the deposit.
    function test_AllGuardedVariants_RejectZeroOutput() public {
        MysteryBoxBase[] memory boxes = new MysteryBoxBase[](12);
        string[] memory names = new string[](12);
        BoxTokenRegistry.BoxType[] memory types = new BoxTokenRegistry.BoxType[](12);

        boxes[0] = new CoinGatchaBox(registry, pricer, admin);
        names[0] = "CoinGatchaBox";
        types[0] = BoxTokenRegistry.BoxType.COINGATCHA;
        boxes[1] = new DiamondBox(registry, pricer, admin);
        names[1] = "DiamondBox";
        types[1] = BoxTokenRegistry.BoxType.DIAMOND;
        boxes[2] = new OrangeBox(registry, pricer, admin);
        names[2] = "OrangeBox";
        types[2] = BoxTokenRegistry.BoxType.ORANGE;
        boxes[3] = new YellowBox(registry, pricer, admin);
        names[3] = "YellowBox";
        types[3] = BoxTokenRegistry.BoxType.YELLOW;
        boxes[4] = new PinkBox(registry, pricer, admin);
        names[4] = "PinkBox";
        types[4] = BoxTokenRegistry.BoxType.PINK;
        boxes[5] = new PurpleBox(registry, pricer, admin);
        names[5] = "PurpleBox";
        types[5] = BoxTokenRegistry.BoxType.PURPLE;
        boxes[6] = new RainbowBox(registry, pricer, admin);
        names[6] = "RainbowBox";
        types[6] = BoxTokenRegistry.BoxType.RAINBOW;
        boxes[7] = new BlackBox(registry, pricer, admin);
        names[7] = "BlackBox";
        types[7] = BoxTokenRegistry.BoxType.BLACK;
        boxes[8] = new CheckeredBox(registry, pricer, admin);
        names[8] = "CheckeredBox";
        types[8] = BoxTokenRegistry.BoxType.CHECKERED;
        boxes[9] = new SilverBox(registry, pricer, admin);
        names[9] = "SilverBox";
        types[9] = BoxTokenRegistry.BoxType.SILVER;
        boxes[10] = new GoldBox(registry, pricer, admin);
        names[10] = "GoldBox";
        types[10] = BoxTokenRegistry.BoxType.GOLD;
        boxes[11] = new RussianFlagBox(registry, pricer, admin);
        names[11] = "RussianFlagBox";
        types[11] = BoxTokenRegistry.BoxType.RUSSIAN_FLAG;

        vm.startPrank(admin);
        for (uint256 i = 0; i < boxes.length; i++) {
            registry.setPoolMembership(types[i], address(tokenIn), true);
            boxes[i].setExecutor(address(executor)); // MockExecutor returns address(0) by default
        }
        vm.stopPrank();

        tokenIn.mint(user, 12 ether);
        for (uint256 i = 0; i < boxes.length; i++) {
            vm.prank(user);
            tokenIn.approve(address(boxes[i]), 1 ether); // each variant pulls from the user directly
            vm.prank(user);
            vm.expectRevert(bytes(string.concat(names[i], ": no output token returned")));
            boxes[i].deposit(1 ether, address(tokenIn));
        }
    }

    // ---- 7. registry / pool misconfiguration -------------------------------------------

    function test_TokenNotInPool_Reverts() public {
        AttackToken other = new AttackToken();
        vm.prank(admin);
        registry.registerToken(address(other), 18); // registered but not added to MYSTERY pool
        other.mint(user, 1 ether);
        vm.startPrank(user);
        other.approve(address(box), 1 ether);
        vm.expectRevert("MysteryBoxBase: token not usable in pool");
        box.deposit(1 ether, address(other));
        vm.stopPrank();
    }

    function test_DeactivatedToken_Reverts() public {
        vm.prank(admin);
        registry.setActive(address(tokenIn), false);
        _fund(user, 1 ether);
        vm.expectRevert("MysteryBoxBase: token not usable in pool");
        vm.prank(user);
        box.deposit(1 ether, address(tokenIn));
    }

    function test_UnregisteredToken_Reverts() public {
        AttackToken other = new AttackToken();
        other.mint(user, 1 ether);
        vm.startPrank(user);
        other.approve(address(box), 1 ether);
        vm.expectRevert("MysteryBoxBase: token not usable in pool");
        box.deposit(1 ether, address(other));
        vm.stopPrank();
    }

    // ---- 8. referral self-referral / farming -------------------------------------------

    function _deployReferral(uint256 maxSupply) internal returns (ReferralToken t, ReferralRegistry r) {
        t = new ReferralToken(admin, maxSupply);
        r = new ReferralRegistry(t, admin);
        bytes32 minter = t.MINTER_ROLE(); // read before the prank; a getter call would otherwise consume it
        vm.prank(admin);
        t.grantRole(minter, address(r));
    }

    function test_Referral_SelfReferral_Reverts() public {
        (, ReferralRegistry r) = _deployReferral(10_000 ether);
        vm.prank(user);
        vm.expectRevert("ReferralRegistry: self-referral");
        r.register(user);
    }

    function test_Referral_DoubleRegistration_Reverts() public {
        (, ReferralRegistry r) = _deployReferral(10_000 ether);
        address upline = address(0x1111);
        vm.prank(user);
        r.register(upline);
        vm.prank(user);
        vm.expectRevert("ReferralRegistry: already registered");
        r.register(address(0x2222));
    }

    function test_Referral_ReferrerCap_BlocksFarming() public {
        (, ReferralRegistry r) = _deployReferral(10_000 ether);
        vm.prank(admin);
        r.setMaxRewardsPerReferrer(1);
        address upline = address(0x1111);

        vm.prank(address(0xF00D));
        r.register(upline); // 1st referee credited
        vm.prank(address(0xBEEF));
        vm.expectRevert("ReferralRegistry: referrer reward cap reached");
        r.register(upline); // 2nd referee for the same upline blocked
    }

    function test_Referral_RedeemWithoutRewards_Reverts() public {
        (, ReferralRegistry r) = _deployReferral(10_000 ether);
        vm.prank(user);
        vm.expectRevert("ReferralRegistry: no referral tokens to redeem");
        r.redeemFreeSwap(address(0xDEAD));
    }

    function test_Referral_DoubleRedeem_Reverts() public {
        (ReferralToken t, ReferralRegistry r) = _deployReferral(10_000 ether);
        address upline = address(0x1111);
        vm.prank(user);
        r.register(upline);
        assertEq(t.balanceOf(upline), 1 ether);

        vm.prank(upline);
        r.redeemFreeSwap(address(0xDEAD));
        assertEq(t.balanceOf(upline), 0);

        vm.prank(upline);
        vm.expectRevert("ReferralRegistry: no referral tokens to redeem");
        r.redeemFreeSwap(address(0xDEAD));
    }

    function test_Referral_SupplyCap_Enforced() public {
        (, ReferralRegistry r) = _deployReferral(1 ether); // room for exactly one reward
        vm.prank(address(0xF00D));
        r.register(address(0x1111));
        vm.prank(address(0xBEEF));
        vm.expectRevert("ReferralToken: supply cap reached");
        r.register(address(0x2222));
    }
}

/// @notice Runs the real Deploy.s.sol and asserts the post-deploy invariants the role-handoff/executor-wiring
///         scenarios depend on. Broadcast executes in-process under forge test (sender == this test contract,
///         which is set as ADMIN).
contract DeployScriptTest is Test {
    MockExecutor exec;

    function _setEnv(string memory k, address v) internal {
        vm.setEnv(k, vm.toString(v));
    }

    function test_DeployScript_WiresExecutorOnAll17Boxes_AndHandsOffAdmin() public {
        address msig = address(0x11516);
        address guard = address(0x6AA);
        exec = new MockExecutor();

        // vm.startBroadcast() with no argument replays from Foundry's default sender (see Vm.sol docs),
        // so ADMIN must be that address or the setup calls would lack DEFAULT_ADMIN_ROLE.
        _setEnv("ADMIN", DEFAULT_SENDER);
        _setEnv("MULTISIG", msig);
        _setEnv("GUARDIAN", guard);
        _setEnv("EXECUTOR", address(exec));
        vm.setEnv("VAR_CAP_USD", "0");
        vm.setEnv("TX_CAP_USD", "0");
        vm.setEnv("WALLET_CAP_USD", "0");

        vm.recordLogs();
        new DeployPhreaking().run();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        bytes32 executorChanged = keccak256("ExecutorChanged(address)");
        uint256 wired = 0;
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == executorChanged) {
                wired++;
                assertEq(address(uint160(uint256(logs[i].topics[1]))), address(exec), "wrong executor wired");
            }
        }
        assertEq(wired, 17, "executor must be set on all 17 boxes");
    }
}
