// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITokenPricer {
    /// @notice Current USD price of `token` in 1e8 units (Chainlink-style). Reverts if unknown.
    function price(address token) external view returns (uint256);
}
