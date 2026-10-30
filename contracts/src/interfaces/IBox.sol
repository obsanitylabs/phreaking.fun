// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Common surface for all phreaking.fun box contracts.
interface IBox {
    /// @notice Emergency pause by the guardian (single tx). While paused, user-facing entry points revert.
    function paused() external view returns (bool);

    event Paused(address indexed guardian);
    event Unpaused(uint256 timelockUntil);
}
