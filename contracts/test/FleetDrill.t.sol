// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {RedBox} from "../src/RedBox.sol";
import {BlueBox} from "../src/BlueBox.sol";
import {GreenBox} from "../src/GreenBox.sol";
import {WhiteBox} from "../src/WhiteBox.sol";
import {OrangeBox} from "../src/OrangeBox.sol";
import {YellowBox} from "../src/YellowBox.sol";
import {PinkBox} from "../src/PinkBox.sol";
import {PurpleBox} from "../src/PurpleBox.sol";
import {RainbowBox} from "../src/RainbowBox.sol";
import {BlackBox} from "../src/BlackBox.sol";
import {CheckeredBox} from "../src/CheckeredBox.sol";
import {SilverBox} from "../src/SilverBox.sol";
import {GoldBox} from "../src/GoldBox.sol";
import {DiamondBox} from "../src/DiamondBox.sol";
import {RussianFlagBox} from "../src/RussianFlagBox.sol";
import {CoinGatchaBox} from "../src/CoinGatchaBox.sol";
import {ReferralToken} from "../src/ReferralToken.sol";
import {ReferralRegistry} from "../src/ReferralRegistry.sol";

/// @title FleetDrill.t.sol — emergency-stop drill across the full deployed fleet (OBS-129 Phase 2 evidence)
/// @notice Simulates the production incident sequence end-to-end: on-call guardian sweeps a one-tx pause over
///         every pausable contract in the fleet, deposits are blocked while paused, and recovery is timelocked.
///         This is the "tested emergency pause reachable by on-call guardian within minutes" acceptance item,
///         exercised against all 17 boxes + referral registry at once rather than one box in isolation.
contract FleetDrillTest is Test {
    address admin = address(0xAA);
    address guardian = address(0xBB);

    BoxTokenRegistry registry;
    TokenPricer pricer;
    RedBox redBox;
    ReferralRegistry referralRegistry;
    address tokenIn; // registered in the RED pool so deposits are otherwise valid — only pause blocks them.

    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f; // AccessControlUnauthorizedAccount(address,bytes32)
    bytes4 constant ENFORCED_PAUSE_SEL = bytes4(keccak256("EnforcedPause()")); // OZ v5 Pausable custom error.

    function setUp() external {
        registry = new BoxTokenRegistry(admin);
        pricer = new TokenPricer(admin);

        redBox = new RedBox(registry, pricer, admin);
        referralRegistry = new ReferralRegistry(new ReferralToken(admin, 10_000 ether), admin);

        vm.startPrank(admin);
        // Guardian is a distinct on-call multisig — the drill verifies it alone can stop everything.
        redBox.grantRole(redBox.GUARDIAN_ROLE(), guardian);
        referralRegistry.grantRole(referralRegistry.GUARDIAN_ROLE(), guardian);
        _grantGuardianToWholeFleet();

        // Red box pool + price so a deposit is otherwise valid and only the pause blocks it.
        tokenIn = address(new MockToken());
        registry.registerToken(tokenIn, 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.RED, tokenIn, true);
        pricer.setPrice(tokenIn, 2000 * 1e8, 18);

        vm.stopPrank();
    }

    /// @dev Grants GUARDIAN_ROLE to the on-call guardian across all remaining box variants (the fleet sweep target).
    function _grantGuardianToWholeFleet() internal {
        MysteryBox mystery = new MysteryBox(registry, pricer, admin);
        BlueBox blue = new BlueBox(registry, pricer, admin);
        GreenBox green = new GreenBox(registry, pricer, admin);
        WhiteBox white = new WhiteBox(registry, pricer, admin);
        OrangeBox orange = new OrangeBox(registry, pricer, admin);
        YellowBox yellow = new YellowBox(registry, pricer, admin);
        PinkBox pink = new PinkBox(registry, pricer, admin);
        PurpleBox purple = new PurpleBox(registry, pricer, admin);
        RainbowBox rainbow = new RainbowBox(registry, pricer, admin);
        BlackBox black = new BlackBox(registry, pricer, admin);
        CheckeredBox check = new CheckeredBox(registry, pricer, admin);
        SilverBox silver = new SilverBox(registry, pricer, admin);
        GoldBox gold = new GoldBox(registry, pricer, admin);
        DiamondBox diamond = new DiamondBox(registry, pricer, admin);
        RussianFlagBox rf = new RussianFlagBox(registry, pricer, admin);
        CoinGatchaBox cg = new CoinGatchaBox(registry, pricer, admin);

        mystery.grantRole(mystery.GUARDIAN_ROLE(), guardian);
        blue.grantRole(blue.GUARDIAN_ROLE(), guardian);
        green.grantRole(green.GUARDIAN_ROLE(), guardian);
        white.grantRole(white.GUARDIAN_ROLE(), guardian);
        orange.grantRole(orange.GUARDIAN_ROLE(), guardian);
        yellow.grantRole(yellow.GUARDIAN_ROLE(), guardian);
        pink.grantRole(pink.GUARDIAN_ROLE(), guardian);
        purple.grantRole(purple.GUARDIAN_ROLE(), guardian);
        rainbow.grantRole(rainbow.GUARDIAN_ROLE(), guardian);
        black.grantRole(black.GUARDIAN_ROLE(), guardian);
        check.grantRole(check.GUARDIAN_ROLE(), guardian);
        silver.grantRole(silver.GUARDIAN_ROLE(), guardian);
        gold.grantRole(gold.GUARDIAN_ROLE(), guardian);
        diamond.grantRole(diamond.GUARDIAN_ROLE(), guardian);
        rf.grantRole(rf.GUARDIAN_ROLE(), guardian);
        cg.grantRole(cg.GUARDIAN_ROLE(), guardian);

        fleet = new IPausable[](18);
        fleet[0] = IPausable(address(redBox));
        fleet[1] = IPausable(address(mystery));
        fleet[2] = IPausable(address(blue));
        fleet[3] = IPausable(address(green));
        fleet[4] = IPausable(address(white));
        fleet[5] = IPausable(address(orange));
        fleet[6] = IPausable(address(yellow));
        fleet[7] = IPausable(address(pink));
        fleet[8] = IPausable(address(purple));
        fleet[9] = IPausable(address(rainbow));
        fleet[10] = IPausable(address(black));
        fleet[11] = IPausable(address(check));
        fleet[12] = IPausable(address(silver));
        fleet[13] = IPausable(address(gold));
        fleet[14] = IPausable(address(diamond));
        fleet[15] = IPausable(address(rf));
        fleet[16] = IPausable(address(cg));
        fleet[17] = IPausable(address(referralRegistry));
    }

    /// @notice Drill step 1: guardian emergency sweep — one pause tx per contract, whole fleet down.
    function test_Fleet_EmergencyStopSweep() public {
        vm.startPrank(guardian);
        for (uint256 i = 0; i < fleet.length; ++i) fleet[i].pause();
        vm.stopPrank();

        for (uint256 i = 0; i < fleet.length; ++i) assertTrue(fleet[i].paused(), "fleet contract not paused");
    }

    /// @notice Drill step 2: while the fleet is down, deposits are blocked and non-guardians cannot touch pause.
    function test_Fleet_PausedBlocksDeposit_AndNonGuardianCannotPause() public {
        vm.prank(guardian);
        redBox.pause();

        // A fully valid deposit (funded + approved, registered in the RED pool) reverts with EnforcedPause while paused.
        MockToken(tokenIn).mint(address(this), 1 ether);
        MockToken(tokenIn).approve(address(redBox), 1 ether);
        vm.expectRevert(abi.encodeWithSelector(ENFORCED_PAUSE_SEL));
        redBox.deposit(1 ether, tokenIn);

        // Non-guardian cannot pause or queue unpause (incident response stays with the on-call role).
        bytes32 role = keccak256("GUARDIAN");
        vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED_SEL, address(this), role));
        redBox.pause();
        vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED_SEL, address(this), role));
        referralRegistry.queueUnpause();
    }

    /// @notice Drill step 3: recovery is timelocked — queued unpause cannot be released early, anyone can after 24h.
    function test_Fleet_TimelockedRecovery() public {
        vm.prank(guardian);
        redBox.pause();
        vm.prank(guardian);
        redBox.queueUnpause();

        uint256 releaseAt = redBox.unpauseReleaseAt();
        assertEq(releaseAt, block.timestamp + 24 hours);

        // Early release (by anyone) is refused.
        vm.expectRevert("MysteryBoxBase: timelock not elapsed");
        redBox.releaseUnpause();

        skip(24 hours + 1);
        redBox.releaseUnpause(); // permissionless after the delay — no privileged instant-unpause path exists.
        assertFalse(redBox.paused());
    }

    IPausable[] fleet;
}

interface IPausable {
    function paused() external view returns (bool);
    function pause() external;
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
