// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Green Box (Shitcoin Recycler): deposit older shitcoins, receive newer qualifying tokens.
/// @dev    Pool = GREEN. Qualifying criteria (contract age < 2y, >= $100k avg daily volume over 90d) are enforced by the
///         executor at settlement; on-chain we hold caps/pause/routing invariants (build-day scope, no live DEX).
contract GreenBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.GREEN;
    }

    /// @dev Delegate settlement to the configured executor, which pays `user` atomically.
    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "GreenBox: executor not set");
        // Interaction last in the deposit CEI sequence; recycler criteria applied off-chain by the executor.
        tokenOut = executor.execute{value: tokenIn == address(0) ? amount : 0}(user, address(this), tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "GreenBox: no output token returned");
    }
}
