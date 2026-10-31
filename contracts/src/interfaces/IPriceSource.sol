// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice One independent USD quote for a token. Implementations must not share a signer,
///         a keeper, or an upstream feed with the other source wired into the same pricer.
interface IPriceSource {
    /// @param usdPerWhole1e8 Whole-token USD at 1e8 (Chainlink-style).
    /// @param decimals_ Token decimals, 1–36. Zero means the source does not cover `token`.
    /// @param updatedAt Seconds timestamp of the quote. Must be fresh relative to block.timestamp.
    function quote(address token) external view returns (uint256 usdPerWhole1e8, uint8 decimals_, uint256 updatedAt);
}
