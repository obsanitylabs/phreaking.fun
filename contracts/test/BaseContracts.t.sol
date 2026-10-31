// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {RolePriceSource} from "../src/RolePriceSource.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {DualQuote} from "./PriceSources.sol";

contract TokenPricerTest is Test {
    TokenPricer pricer;
    RolePriceSource primary;
    RolePriceSource secondary;
    address admin = address(0xAA);
    address keeperA = address(0xBB);
    address keeperB = address(0xBC);
    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f;

    function setUp() external {
        vm.startPrank(admin);
        primary = new RolePriceSource(admin);
        secondary = new RolePriceSource(admin);
        pricer = new TokenPricer(admin, primary, secondary);
        primary.grantRole(primary.KEEPER_ROLE(), keeperA);
        secondary.grantRole(secondary.KEEPER_ROLE(), keeperB);
        vm.stopPrank();
    }

    address constant tokenA = address(0x11);

    function _quoteBoth(address token, uint256 priceUSD, uint8 decimals_) internal {
        vm.prank(keeperA);
        primary.setQuote(token, priceUSD, decimals_);
        vm.prank(keeperB);
        secondary.setQuote(token, priceUSD, decimals_);
    }

    function test_AgreedPrice_AndRead() public {
        _quoteBoth(tokenA, 500 * 1e8, 18);
        assertEq(pricer.price(tokenA), 500 * 1e8);
    }

    function test_StalePrice_Reverts() public {
        _quoteBoth(tokenA, 500 * 1e8, 18);
        skip(3600 + 1); // > HEARTBEAT_SECONDS (1 hour)
        vm.expectRevert(TokenPricer.StalePrice.selector);
        pricer.price(tokenA);
    }

    function test_FreshPrice_Passes() public {
        _quoteBoth(tokenA, 500 * 1e8, 18);
        skip(3599); // just under heartbeat — still fresh
        assertEq(pricer.price(tokenA), 500 * 1e8);
    }

    function test_SetQuote_OnlyKeeperRole() public {
        bytes32 keeperRoleId = keccak256("KEEPER_ROLE");
        vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED_SEL, address(this), keeperRoleId));
        primary.setQuote(tokenA, 1e8, 18);
    }

    function test_KeeperRole_AdminIsDefaultAdmin() public {
        assertEq(primary.getRoleAdmin(bytes32(keccak256("KEEPER_ROLE"))), bytes32(0));
    }

    function test_SetQuote_TruncationGuard() public {
        vm.prank(keeperA);
        vm.expectRevert("RolePriceSource: price too large");
        primary.setQuote(tokenA, type(uint256).max, 18);
    }

    function test_UnregisteredToken_Reverts() public {
        vm.expectRevert(TokenPricer.UnknownToken.selector);
        pricer.price(address(0x99));
    }

    function test_NativeEther_ZeroAddress() public {
        _quoteBoth(address(0), 2500 * 1e8, 18);
        assertEq(pricer.price(address(0)), 2500 * 1e8);
    }

    function test_PriceOf_Stale_Reverts() public {
        _quoteBoth(tokenA, 500 * 1e8, 18);
        skip(3600 + 1);
        vm.expectRevert(TokenPricer.StalePrice.selector);
        pricer.priceOf(tokenA);
    }

    function test_GetUSDValue() public {
        _quoteBoth(tokenA, 500 * 1e8, 18); // $500 per whole token (18 decimals)
        uint256 value = pricer.getUSDValue(tokenA, 2 ether); // 2 whole tokens = $1000
        assertEq(value, 1000 * 1e8);
    }

    function test_SingleSource_CannotPublish() public {
        vm.prank(keeperA);
        primary.setQuote(tokenA, 500 * 1e8, 18);
        vm.expectRevert(TokenPricer.UnknownToken.selector);
        pricer.price(tokenA);
    }

    function test_DivergentOracle_Reverts() public {
        vm.prank(keeperA);
        primary.setQuote(tokenA, 500 * 1e8, 18);
        vm.prank(keeperB);
        secondary.setQuote(tokenA, 506 * 1e8, 18); // 1.2% — outside the 1% band
        vm.expectRevert(TokenPricer.OracleDivergence.selector);
        pricer.price(tokenA);
    }

    function test_WithinBand_UsesHigherQuote() public {
        vm.prank(keeperA);
        primary.setQuote(tokenA, 500 * 1e8, 18);
        vm.prank(keeperB);
        secondary.setQuote(tokenA, 504 * 1e8, 18); // 0.8% — inside the band
        assertEq(pricer.price(tokenA), 504 * 1e8);
    }

    function test_OneStaleSource_Reverts() public {
        vm.prank(keeperA);
        primary.setQuote(tokenA, 500 * 1e8, 18);
        skip(3600 + 1);
        vm.prank(keeperB);
        secondary.setQuote(tokenA, 500 * 1e8, 18);
        vm.expectRevert(TokenPricer.StalePrice.selector);
        pricer.price(tokenA);
    }

    function test_DecimalMismatch_Reverts() public {
        vm.prank(keeperA);
        primary.setQuote(tokenA, 500 * 1e8, 18);
        vm.prank(keeperB);
        secondary.setQuote(tokenA, 500 * 1e8, 6);
        vm.expectRevert(TokenPricer.DecimalMismatch.selector);
        pricer.price(tokenA);
    }

    function test_SameSourceTwice_Reverts() public {
        vm.expectRevert(TokenPricer.SourcesMustDiffer.selector);
        new TokenPricer(admin, primary, primary);
    }

    function test_KeeperCannotWriteTheOtherSource() public {
        bytes32 keeperRoleId = keccak256("KEEPER_ROLE");
        vm.prank(keeperA);
        vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED_SEL, keeperA, keeperRoleId));
        secondary.setQuote(tokenA, 1e8, 18);
    }
}

contract BoxTokenRegistryTest is Test {
    BoxTokenRegistry registry;
    address admin = address(0xAA);
    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f;
    bytes32 constant DEFAULT_ADMIN_ROLE = bytes32(0);

    address constant tokenX = address(0x22);

    function setUp() external {
        registry = new BoxTokenRegistry(admin);
    }

    function test_RegisterAndCanUse() public {
        vm.prank(admin);
        registry.registerToken(tokenX, 18);
        assertEq(registry.decimalsOf(tokenX), 18);

        assertFalse(registry.canUse(tokenX, BoxTokenRegistry.BoxType.RED));

        vm.prank(admin);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.RED, tokenX, true);
        assertTrue(registry.canUse(tokenX, BoxTokenRegistry.BoxType.RED));

        assertFalse(registry.canUse(tokenX, BoxTokenRegistry.BoxType.BLUE));
    }

    function test_DuplicateRegister_Reverts() public {
        vm.startPrank(admin);
        registry.registerToken(tokenX, 18);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("DuplicateToken()"))));
        registry.registerToken(tokenX, 6);
        vm.stopPrank();
    }

    function test_Deactivate_Token() public {
        vm.startPrank(admin);
        registry.registerToken(tokenX, 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.RED, tokenX, true);
        assertTrue(registry.canUse(tokenX, BoxTokenRegistry.BoxType.RED));

        registry.setActive(tokenX, false);
        assertFalse(registry.canUse(tokenX, BoxTokenRegistry.BoxType.RED));

        registry.setActive(tokenX, true);
        assertTrue(registry.canUse(tokenX, BoxTokenRegistry.BoxType.RED));
        vm.stopPrank();
    }

    function test_Register_OnlyAdmin() public {
        vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED_SEL, address(this), DEFAULT_ADMIN_ROLE));
        registry.registerToken(tokenX, 18);
    }

    function test_Register_ZeroDecimals_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("BoxTokenRegistry: bad decimals");
        registry.registerToken(tokenX, 0);
    }

    function test_SetPool_UnregisteredToken_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("BoxTokenRegistry: unregistered token");
        registry.setPoolMembership(BoxTokenRegistry.BoxType.RED, address(0x33), true);
    }
}
