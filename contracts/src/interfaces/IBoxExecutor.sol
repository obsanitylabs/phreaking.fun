// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the off-chain swap executor that settles each box deposit
///         (DEX routing, cross-chain bridging via Axelar/Synapse). The contract only
///         holds user funds and dispatches to this trusted executor; it never moves
///         funds itself outside the documented flow.
interface IBoxExecutor {
    /// @notice Settle a single box deposit. `user` is the depositor, `tokenIn`/`amount`
    ///         were pulled from them by the box contract, and `valueUsd1e8` is the USD
    ///         value at deposit time used for slippage bounds (Blue: +/- 1%).
    /// @return tokenOut The output token actually delivered to `user`.
    function execute(
        address user,
        address boxType, // box contract address identifies the variant ruleset
        address tokenIn,
        uint256 amount,
        uint256 valueUsd1e8
    ) external payable returns (address tokenOut);
}
