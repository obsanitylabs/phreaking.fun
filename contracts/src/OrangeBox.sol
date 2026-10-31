// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Orange Box (Shit to Bit): convert dust and selected coins to WBTC. Executor consolidates
///         small balances into a single WBTC payout atomically via the configured swap route.
contract OrangeBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.ORANGE;
    }

    /// @dev Delegate settlement to the configured executor, which pays `user` atomically.
    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "OrangeBox: executor not set");
        // Interaction last in the deposit CEI sequence.
        tokenOut = _dispatchToExecutor(user, tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "OrangeBox: no output token returned");
    }
}
