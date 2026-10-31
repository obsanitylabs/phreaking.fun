// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Pink Box: pool-based swap variant (build-day placeholder pending full spec confirmation).
///         Delegates settlement to the configured IBoxExecutor; slippage and routing are off-chain.
contract PinkBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.PINK;
    }

    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "PinkBox: executor not set");
        return executor.execute{value: tokenIn == address(0) ? amount : 0}(user, address(this), tokenIn, amount, valueUsd1e8);
    }
}
