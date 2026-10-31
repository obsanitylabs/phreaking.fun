// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Blue Box ($-for-$): deposit any lot of crypto, receive different tokens worth the same USD +/- 1% slippage.
/// @dev    Pool = BLUE. The deposit-time USD value (`valueUsd1e8`) is forwarded to the executor so it can enforce the
///         +/- 1% bound at settlement; on-chain we only hold caps/pause/routing invariants (build-day scope, no live DEX).
contract BlueBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.BLUE;
    }

    /// @dev Delegate settlement to the configured executor, which pays `user` atomically.
    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "BlueBox: executor not set");
        // Interaction last in the deposit CEI sequence; slippage bound applied off-chain by the executor.
        tokenOut = executor.execute{value: tokenIn == address(0) ? amount : 0}(user, address(this), tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "BlueBox: no output token returned");
    }
}
