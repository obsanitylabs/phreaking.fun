// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {MysteryBoxBase} from "./MysteryBoxBase.sol";
import {BoxTokenRegistry} from "./BoxTokenRegistry.sol";
import {IBoxExecutor} from "./interfaces/IBoxExecutor.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice White Box (Donate): deposit crypto, executor swaps to USDC and donates anonymously
///         via TheGivingBlock. No tax receipt; user receives a Hide-The-Pain-Harold NFT on Polygon.
/// @dev OBS-128 H-1 remediation: the supported donation token set is whatever this box's pool admits —
///      native Ether (address(0) convention, via msg.value) plus ERC20s such as USDC — reconciled with
///      the frontend donation flow. Forwarding semantics are delegated to the executor off-chain; on-chain
///      every unit is attributed (DepositReceived + cap accounting) before delegation, and batch donations
///      are simply repeated single capped deposits (no batching bypasses per-tx caps).
contract WhiteBox is MysteryBoxBase {
    constructor(BoxTokenRegistry registry_, ITokenPricer pricer_, address admin) MysteryBoxBase(registry_, pricer_, admin) {}

    /// @notice Donation entry point: identical to `deposit` — native Ether via msg.value, ERC20 via allowance.
    function donate(uint256 amount, address tokenIn) external payable returns (address tokenOut) {
        return deposit(amount, tokenIn);
    }

    function boxType() public pure override returns (BoxTokenRegistry.BoxType) {
        return BoxTokenRegistry.BoxType.WHITE;
    }

    function _executeSwap(address user, address tokenIn, uint256 amount, uint256 valueUsd1e8) internal override returns (address tokenOut) {
        require(address(executor) != address(0), "WhiteBox: executor not set");
        tokenOut = executor.execute(user, address(this), tokenIn, amount, valueUsd1e8);
        require(tokenOut != address(0), "WhiteBox: no output token returned");
    }
}
