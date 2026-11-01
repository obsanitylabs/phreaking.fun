// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";

import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";

/// @title ConfigurePools.s.sol — OBS-621 Sepolia pool-membership configuration
/// @notice Enables every registered token for every box variant in the canonical OBS-321
///         `BoxTokenRegistry` (`0x43Ff92ce3eC51c96FFD4031fc85f63ea2b6BEA1D`).
/// @dev    DEPLOYMENT-PACKAGE GAP CLOSED: `Deploy.s.sol` registers token decimals but deliberately
///         leaves pool membership as an admin decision. Until this script runs, every deposit reverts
///         with "MysteryBoxBase: token not usable" because `registry.canUse(token, boxType())` is false.
///
///         The registry API is per-`(box, token)` only — there is no batch entrypoint — so the exact
///         call set is 17 box enum values × 4 registered tokens = 68 `setPoolMembership(box, token, true)`
///         calls. Re-running is idempotent (setting an already-true membership only re-emits the event).
///
///         SEPOLIA ONLY. The signer MUST hold `DEFAULT_ADMIN_ROLE` on the registry. On the canonical
///         OBS-321 fleet that is the Sepolia MULTISIG EOA
///         `0xCD63Bde25B9727bAA0A08bb6219a551262Ac8968`; the deployer EOA does NOT hold it after the
///         broadcast's N-2 renouncement. The MULTISIG EOA needs a dust gas balance: Sepolia gas is
///         ~17–21 wei, so 68 calls cost a fraction of a nano-SEPETH. Fund it from the deployer first.
///
///         Run (with the MULTISIG key; never put key material in a file or env export shown in a log):
///           forge script script/ConfigurePools.s.sol \
///             --rpc-url "$SEPOLIA_RPC_URL" \
///             --private-key "$MULTISIG_KEY" \
///             --broadcast --slow \
///             --with-gas-price 21 --priority-gas-price 1
contract ConfigurePools is Script {
    address internal constant REGISTRY = 0x43Ff92ce3eC51c96FFD4031fc85f63ea2b6BEA1D;

    address internal constant NATIVE = address(0);
    address internal constant SEPOLIA_USDC_E = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // 6 decimals
    address internal constant SEPOLIA_WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // 18 decimals
    address internal constant SEPOLIA_LINK = 0x779877A7B0D9E8603169DdbD7836e478b4624789; // 18 decimals

    uint8 internal constant BOX_COUNT = 17;

    function run() external {
        require(block.chainid == 11155111, "ConfigurePools: Sepolia only");
        BoxTokenRegistry registry = BoxTokenRegistry(REGISTRY);

        address[4] memory tokens = [NATIVE, SEPOLIA_USDC_E, SEPOLIA_WETH, SEPOLIA_LINK];

        vm.startBroadcast();
        for (uint8 box = 0; box < BOX_COUNT; box++) {
            for (uint256 i = 0; i < tokens.length; i++) {
                registry.setPoolMembership(BoxTokenRegistry.BoxType(box), tokens[i], true);
            }
        }
        vm.stopBroadcast();

        _verify(registry, tokens);
    }

    function _verify(BoxTokenRegistry registry, address[4] memory tokens) internal view {
        for (uint8 box = 0; box < BOX_COUNT; box++) {
            for (uint256 i = 0; i < tokens.length; i++) {
                require(
                    registry.canUse(tokens[i], BoxTokenRegistry.BoxType(box)),
                    "ConfigurePools: (box, token) pair not enabled"
                );
            }
        }
        console.log("ConfigurePools: all 68 (box, token) pairs verified canUse=true");
    }
}
