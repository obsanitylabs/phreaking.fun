// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Gold Box: premium-tier curated swap variant. Delegates settlement to IBoxExecutor;
///         tier criteria and routing applied off-chain per build-day scope.
contract GoldBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.GOLD;
    }

    /// @dev Delegate settlement to the configured executor, which pays `user` atomically.
    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "GoldBox: executor not set");
        // Interaction last in the deposit CEI sequence.
        tokenOut = _dispatchToExecutor(user, tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "GoldBox: no output token returned");
    }
}
