// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Interface for the off-chain swap executor that settles each box deposit
///         (DEX routing, cross-chain bridging via Axelar/Synapse). The box holds a user's
///         deposit only for the duration of the atomic deposit transaction, then hands the
///         funds to this trusted executor for settlement.
///
///         Obligations of every implementation:
///          - ERC20 deposits use the PULL model: the box grants an exact per-deposit allowance
///            immediately before `execute` and resets it to zero immediately after. The executor
///            must pull exactly `amount` of `tokenIn` from `boxType` (the box contract address)
///            during the call, and must not rely on any standing allowance between deposits.
///          - Native deposits (`tokenIn == address(0)`) arrive as `msg.value == amount`. The
///            executor must implement `receive()` (or a payable fallback) so it can accept them.
///          - Settlement must pay `user` atomically within the same `execute` call.
interface IBoxExecutor {
    /// @notice Settle a single box deposit. `user` is the depositor. For ERC20 deposits the box
    ///         has set a one-shot allowance of `amount` for this executor and `msg.value` is 0;
    ///         the executor pulls `amount` from `boxType`. For native deposits `msg.value` equals
    ///         `amount` and the box forwards it directly. `valueUsd1e8` is the USD value at deposit
    ///         time used for slippage bounds (Blue: +/- 1%).
    /// @return tokenOut The output token actually delivered to `user`.
    function execute(
        address user,
        address boxType, // box contract address identifies the variant ruleset
        address tokenIn,
        uint256 amount,
        uint256 valueUsd1e8
    ) external payable returns (address tokenOut);
}
