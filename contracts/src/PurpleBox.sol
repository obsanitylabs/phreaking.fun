// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Purple Box (NFT to Shitcoin Highway): dump unwanted NFTs for altcoins of similar dollar value,
///         or vice versa. Executor handles ERC-721 approval flow and altcoin delivery off-chain.
contract PurpleBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.PURPLE;
    }

    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "PurpleBox: executor not set");
        tokenOut = _dispatchToExecutor(user, tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "PurpleBox: no output token returned");
    }
}
