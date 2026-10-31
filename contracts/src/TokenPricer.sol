// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";
import {IPriceSource} from "./interfaces/IPriceSource.sol";

/// @notice Redundant USD feed for box caps and slippage math.
///         A quote is accepted only when two independent sources agree within MAX_DEVIATION_BPS
///         and both are inside the 1 hour heartbeat. One stale, missing, or diverging source fails closed.
/// @dev    Non-upgradeable. Sources are immutable so a compromised admin cannot swap a feed for a colluding one.
///         The published price is the higher of the two agreeing quotes. Caps therefore count a deposit
///         at least as large as either honest source, so a suppressed quote cannot shrink value-at-risk.
contract TokenPricer is AccessControl, ITokenPricer {
    uint256 internal constant HEARTBEAT_SECONDS = 1 hours;
    uint256 public constant MAX_DEVIATION_BPS = 100; // 1% — matches the Blue Box slippage bound
    uint256 private constant BPS = 10_000;

    IPriceSource public immutable primary;
    IPriceSource public immutable secondary;

    error SourcesMustDiffer();
    error UnknownToken();
    error StalePrice();
    error ClockSkew();
    error DecimalMismatch();
    error OracleDivergence();

    constructor(address admin, IPriceSource primary_, IPriceSource secondary_) {
        if (address(primary_) == address(secondary_) || address(primary_) == address(0) || address(secondary_) == address(0)) {
            revert SourcesMustDiffer();
        }
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        primary = primary_;
        secondary = secondary_;
    }

    /// @notice Current USD price of one WHOLE `token` at 1e8. Reverts unless both sources agree.
    function price(address token) external view returns (uint256 usd1e8) {
        (usd1e8,) = _agreed(token);
    }

    /// @notice Whole-token USD at 1e8 plus the decimals both sources reported.
    function priceOf(address token) external view returns (uint256 usdPerWhole1e8, uint8 decimals_) {
        (usdPerWhole1e8, decimals_) = _agreed(token);
    }

    /// @notice USD value of `amount` (token-native units) at 1e8.
    function getUSDValue(address token, uint256 amount) public view returns (uint256 usd1e8) {
        (uint256 whole, uint8 decimals_) = _agreed(token);
        usd1e8 = (amount * whole) / 10 ** uint256(decimals_);
    }

    /// @notice True when both sources currently agree. Does not revert.
    function isFresh(address token) external view returns (bool) {
        (uint256 aPrice, uint8 aDecimals, uint256 aUpdated) = primary.quote(token);
        (uint256 bPrice, uint8 bDecimals, uint256 bUpdated) = secondary.quote(token);
        if (aDecimals == 0 || bDecimals == 0 || aPrice == 0 || bPrice == 0) return false;
        if (aDecimals != bDecimals || aDecimals > 36) return false;
        if (!_timestampFresh(aUpdated) || !_timestampFresh(bUpdated)) return false;
        return _withinBand(aPrice, bPrice);
    }

    function _agreed(address token) internal view returns (uint256 usdPerWhole1e8, uint8 decimals_) {
        (uint256 aPrice, uint8 aDecimals, uint256 aUpdated) = primary.quote(token);
        (uint256 bPrice, uint8 bDecimals, uint256 bUpdated) = secondary.quote(token);
        if (aDecimals == 0 || bDecimals == 0 || aPrice == 0 || bPrice == 0) revert UnknownToken();
        if (aDecimals != bDecimals || aDecimals > 36) revert DecimalMismatch();
        if (!_timestampFresh(aUpdated) || !_timestampFresh(bUpdated)) {
            if (block.timestamp < aUpdated || block.timestamp < bUpdated) revert ClockSkew();
            revert StalePrice();
        }
        if (!_withinBand(aPrice, bPrice)) revert OracleDivergence();
        // Higher quote is the conservative cap input. A suppressed source cannot shrink VaR inside the band.
        usdPerWhole1e8 = aPrice > bPrice ? aPrice : bPrice;
        decimals_ = aDecimals;
    }

    function _timestampFresh(uint256 updatedAt) internal view returns (bool) {
        return block.timestamp >= updatedAt && block.timestamp - updatedAt < HEARTBEAT_SECONDS;
    }

    function _withinBand(uint256 a, uint256 b) internal pure returns (bool) {
        uint256 hi = a > b ? a : b;
        uint256 lo = a > b ? b : a;
        // hi <= lo * (1 + band). Multiplication is safe: prices fit in uint80/1e8 by source construction,
        // and this product stays well under 2^256.
        return hi * BPS <= lo * (BPS + MAX_DEVIATION_BPS);
    }
}
