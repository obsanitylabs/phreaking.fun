// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {ReferralToken} from "../src/ReferralToken.sol";
import {ReferralRegistry} from "../src/ReferralRegistry.sol";

abstract contract ReferralBase is Test {
    ReferralToken token;
    ReferralRegistry registry;
    address admin = address(0xAA);
    address guardian = address(0xBB);
    address uplink = address(0xCC);   // referrer — receives the reward
    address referee1 = address(0xDD); // new user who claims a referral
    address referee2 = address(0xEE);
    address tokenOut = address(0x99);

    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f; // AccessControlUnauthorizedAccount(address,bytes32)

    function _unauthorizedError(address caller, bytes32 role) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(UNAUTHORIZED_SEL, caller, role);
    }

    function setUp() external virtual {
        token = new ReferralToken(admin, 10_000 ether); // hard supply cap = program VaR backstop.
        registry = new ReferralRegistry(token, admin);

        vm.startPrank(admin);
        token.grantRole(token.MINTER_ROLE(), address(registry)); // only the registry mints/burns rewards.
        registry.grantRole(registry.GUARDIAN_ROLE(), guardian);
        token.grantRole(token.MINTER_ROLE(), address(this)); // test helper minting for redemption/supply-cap scenarios.
        vm.stopPrank();
    }

    function _register(address referee, address up) internal {
        vm.prank(referee);
        registry.register(up);
    }

    function _approveRedeem(address holder) internal {
        vm.prank(holder);
        token.approve(address(registry), 1 ether);
    }
}

contract ReferralRegistrationTest is ReferralBase {
    function test_Register_CreditsUplinkOneWholeToken() public {
        _register(referee1, uplink);
        assertEq(token.balanceOf(uplink), 1 ether, "uplink not credited");
        assertEq(registry.referralsOf(uplink), 1, "referral count wrong");

        _register(referee2, uplink); // second referee credits the same uplink again.
        assertEq(token.balanceOf(uplink), 2 ether, "second credit missing");
    }

    function test_Register_EmitsEvent() public {
        vm.expectEmit(true, false, true, true);
        emit ReferralRegistry.ReferralRegistered(referee1, uplink);
        _register(referee1, uplink);
    }

    function test_Register_SelfReferral_Reverts() public {
        vm.prank(uplink);
        vm.expectRevert("ReferralRegistry: self-referral");
        registry.register(address(uplink));
    }

    function test_Register_DuplicateReferee_Reverts() public {
        _register(referee1, uplink);
        vm.prank(referee1);
        vm.expectRevert("ReferralRegistry: already registered");
        registry.register(uplink);
    }

    function test_Register_ZeroUplink_Reverts() public {
        vm.prank(referee1);
        vm.expectRevert("ReferralRegistry: zero upline");
        registry.register(address(0));
    }

    function test_Register_ReferrerCap_Enforced() public {
        vm.startPrank(admin);
        registry.setMaxRewardsPerReferrer(2); // lifetime cap = 2 whole reward tokens (one per referral).
        vm.stopPrank();

        _register(referee1, uplink);
        _register(referee2, uplink);
        assertEq(token.balanceOf(uplink), 2 ether, "cap not reached");

        address referee3 = address(0xFF);
        vm.prank(referee3);
        vm.expectRevert("ReferralRegistry: referrer reward cap reached");
        registry.register(uplink);
    }

    function test_Register_SupplyCap_Reverts() public {
        // Supply cap is 10_000 whole tokens; mint to the edge then one more referee must revert.
        token.mint(address(this), 9_999 ether);
        _register(referee1, uplink); // brings supply to exactly maxSupply.
        address referee3 = address(0xFF);
        vm.prank(referee3);
        vm.expectRevert("ReferralToken: supply cap reached");
        registry.register(uplink);
    }

    function test_SetMaxRewardsPerReferrer_OnlyAdmin() public {
        bytes32 adminRole = registry.DEFAULT_ADMIN_ROLE();
        vm.prank(guardian);
        vm.expectRevert(_unauthorizedError(address(guardian), adminRole));
        registry.setMaxRewardsPerReferrer(1 ether);

        vm.prank(referee1); // plain user.
        vm.expectRevert(_unauthorizedError(address(referee1), adminRole));
        registry.setMaxRewardsPerReferrer(1 ether);
    }
}

contract ReferralRedemptionTest is ReferralBase {
    function _giveReward(address who) internal {
        token.mint(who, 1 ether); // simulate an earned reward for redemption tests.
    }

    function test_Redeem_BurnsTokenAndEmitsGrant() public {
        _giveReward(uplink);

        _approveRedeem(uplink);
        vm.expectEmit(true, true, true, true);
        emit ReferralRegistry.FreeSwapGranted(uplink, tokenOut);
        vm.prank(uplink);
        registry.redeemFreeSwap(tokenOut);

        assertEq(token.balanceOf(uplink), 0, "reward not burned");
    }

    function test_Redeem_NoBalance_Reverts() public {
        vm.prank(referee1); // never referred anyone, holds no tokens.
        vm.expectRevert("ReferralRegistry: no referral tokens to redeem");
        registry.redeemFreeSwap(tokenOut);
    }

    function test_Redeem_ZeroToken_Reverts() public {
        _giveReward(uplink);
        vm.prank(uplink);
        vm.expectRevert("ReferralRegistry: zero token");
        registry.redeemFreeSwap(address(0));
    }

    function test_FullFlow_RegisterThenRedeem() public {
        _register(referee1, uplink); // referee earns uplink one whole reward.
        assertEq(token.balanceOf(uplink), 1 ether, "precondition failed");

        _approveRedeem(uplink);
        vm.prank(uplink);
        registry.redeemFreeSwap(tokenOut); // spend the earned free swap.
        assertEq(token.balanceOf(uplink), 0, "reward not consumed");
    }

    function test_Redeem_RequiresAllowance() public {
        _giveReward(uplink);
        vm.prank(uplink);
        vm.expectRevert();
        registry.redeemFreeSwap(tokenOut);
        assertEq(token.balanceOf(uplink), 1 ether, "burned without allowance");
    }

    function test_Redeem_CannotBurnTransferredBalance() public {
        _giveReward(uplink);
        vm.prank(uplink);
        token.transfer(referee1, 1 ether);

        // Original earner still has no balance. New holder must approve before redeeming.
        vm.prank(uplink);
        vm.expectRevert("ReferralRegistry: no referral tokens to redeem");
        registry.redeemFreeSwap(tokenOut);

        vm.prank(referee1);
        vm.expectRevert();
        registry.redeemFreeSwap(tokenOut);
        assertEq(token.balanceOf(referee1), 1 ether, "transferred reward burned without allowance");

        _approveRedeem(referee1);
        vm.prank(referee1);
        registry.redeemFreeSwap(tokenOut);
        assertEq(token.balanceOf(referee1), 0);
    }
}

contract ReferralPauseTest is ReferralBase {
    function test_Pause_InOneTx_BlocksRegisterAndRedeem() public {
        _giveRewardHelper(); // give uplink a token so redeem path is exercisable pre-pause.
        vm.prank(guardian);
        registry.pause();
        assertTrue(registry.paused(), "not paused");

        // OZ v5 Pausable uses custom error EnforcedPause()
        vm.prank(referee1);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        registry.register(uplink);

        _approveRedeem(uplink);
        vm.prank(uplink);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("EnforcedPause()"))));
        registry.redeemFreeSwap(tokenOut);
    }

    function test_Pause_OnlyGuardian() public {
        bytes32 guardianRole = registry.GUARDIAN_ROLE();
        vm.prank(admin); // admin is not a guardian by default.
        vm.expectRevert(_unauthorizedError(address(admin), guardianRole));
        registry.pause();

        vm.prank(referee1);
        vm.expectRevert(_unauthorizedError(address(referee1), guardianRole));
        registry.queueUnpause();
    }

    function test_TimelockedUnpause_QueueThenRelease() public {
        _giveRewardHelper();
        vm.startPrank(guardian);
        registry.pause();
        registry.queueUnpause();
        vm.stopPrank();

        assertEq(registry.unpauseReleaseAt(), block.timestamp + registry.UNPAUSE_DELAY(), "release time wrong");

        // Release before the delay reverts.
        vm.expectRevert("ReferralRegistry: timelock not elapsed");
        registry.releaseUnpause();
        assertTrue(registry.paused(), "still must be paused");

        // After 24h anyone can release (permissionless, on schedule).
        vm.warp(block.timestamp + registry.UNPAUSE_DELAY());
        registry.releaseUnpause();
        assertFalse(registry.paused(), "not unpaused");

        _register(referee1, uplink); // works again post-unpause.
    }

    function test_Pause_CancelsQueuedUnpause() public {
        vm.startPrank(guardian);
        registry.pause();
        registry.queueUnpause();
        vm.stopPrank();
        assertGt(registry.unpauseReleaseAt(), 0);

        vm.prank(guardian);
        registry.pause();
        assertEq(registry.unpauseReleaseAt(), 0);

        vm.warp(block.timestamp + registry.UNPAUSE_DELAY());
        vm.expectRevert("ReferralRegistry: nothing queued");
        registry.releaseUnpause();
        assertTrue(registry.paused());
    }

    function test_QueueUnpause_DoubleQueue_Reverts() public {
        vm.startPrank(guardian);
        registry.pause();
        registry.queueUnpause();
        vm.expectRevert("ReferralRegistry: already queued");
        registry.queueUnpause();
        vm.stopPrank();
    }

    function _giveRewardHelper() internal {
        token.mint(uplink, 1 ether);
    }
}
