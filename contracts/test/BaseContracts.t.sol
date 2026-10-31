// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";

contract TokenPricerTest is Test {
    TokenPricer pricer;
    address admin = address(0xAA);
    address pricerRole = address(0xBB);
    bytes4 constant UNAUTHORIZED_SEL = 0xe2517d3f;

    function setUp() external {
        pricer = new TokenPricer(admin);
        vm.startPrank(admin);
        pricer.grantRole(pricer.PRICER_ROLE(), pricerRole);
        vm.stopPrank();
    }

    address constant tokenA = address(0x11);

    function test_SetPrice_AndRead() public {
        vm.prank(pricerRole);
        pricer.setPrice(tokenA, 500 * 1e8, 18);
        assertEq(pricer.price(tokenA), 500 * 1e8);
    }

    function test_StalePrice_Reverts() public {
        vm.prank(pricerRole);
        pricer.setPrice(tokenA, 500 * 1e8, 18);
        skip(3600 + 1); // > HEARTBEAT_SECONDS (1 hour)
        vm.expectRevert("TokenPricer: stale price");
        pricer.price(tokenA);
    }

    function test_PriceOf_Stale_Reverts() public {
        // LOW fix regression: priceOf() must apply the same freshness guard as price()/getUSDValue().
        vm.prank(pricerRole);
        pricer.setPrice(tokenA, 500 * 1e8, 18);
        skip(3600 + 1);
        vm.expectRevert("TokenPricer: stale price");
        pricer.priceOf(tokenA);
    }

    function test_FreshPrice_Passes() public {
        vm.prank(pricerRole);
        pricer.setPrice(tokenA, 500 * 1e8, 18);
        skip(3599); // just under heartbeat — still fresh
        assertEq(pricer.price(tokenA), 500 * 1e8);
    }

    function test_SetPrice_OnlyPricerRole() public {
        bytes32 pricerRoleId = keccak256("PRICER_ROLE");
        vm.expectRevert(abi.encodeWithSelector(UNAUTHORIZED_SEL, address(this), pricerRoleId));
        pricer.setPrice(tokenA, 1e8, 18); // caller has no PRICER_ROLE
    }

    function test_PricerRole_AdminIsDefaultAdmin() public {
        // Multisig-governed rotation: DEFAULT_ADMIN governs PRICER_ROLE (matches box GUARDIAN wiring).
        assertEq(pricer.getRoleAdmin(bytes32(keccak256("PRICER_ROLE"))), bytes32(0));
    }

    function test_SetPrice_TruncationGuard() public {
        vm.prank(pricerRole);
        uint256 huge = type(uint256).max;
        vm.expectRevert("TokenPricer: price too large for uint80@1e8");
        pricer.setPrice(tokenA, huge, 18);
    }

    function test_UnregisteredToken_Reverts() public {
        address unknown = address(0x99);
        vm.expectRevert("TokenPricer: unknown token");
        pricer.price(unknown);
    }

    function test_SetPrice_NativeEther_ZeroAddress() public {
        // address(0) is the native-Ether convention (OBS-128 H-1 donation-path support).
        vm.prank(pricerRole);
        pricer.setPrice(address(0), 2500 * 1e8, 18);
        assertEq(pricer.price(address(0)), 2500 * 1e8);
    }

    function test_GetUSDValue() public {
        vm.prank(pricerRole);
        pricer.setPrice(tokenA, 500 * 1e8, 18); // $500 per whole token (18 decimals)
        uint256 value = pricer.getUSDValue(tokenA, 2 ether); // 2 whole tokens = $1000
        assertEq(value, 1000 * 1e8);
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

    function test_Register_ZeroDecimals_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("BoxTokenRegistry: zero decimals");
        registry.registerToken(tokenX, 0);
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

    function test_SetPool_UnregisteredToken_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("BoxTokenRegistry: unregistered token");
        registry.setPoolMembership(BoxTokenRegistry.BoxType.RED, address(0x33), true);
    }
}
