// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Generic Mystery Box: deposit a whitelisted whole token, receive whatever the executor settles.
/// @dev    Pool = MYSTERY (additive enum value). Distinct from Red (1:1) / Blue ($-for-$) / Green (recycler);
///         slippage and per-box criteria are applied by the trusted off-chain executor at settlement time.
contract MysteryBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.MYSTERY;
    }

    /// @dev Delegate settlement to the configured executor, which pays `user` atomically.
    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "MysteryBox: executor not set");
        // Interaction last in the deposit CEI sequence.
        tokenOut = executor.execute(user, address(this), tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "MysteryBox: no output token returned");
    }
}
