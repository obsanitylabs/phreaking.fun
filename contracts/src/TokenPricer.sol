// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ITokenPricer} from "./interfaces/ITokenPricer.sol";

/// @notice Feed for token dollar values used by slippage math (BlueBox, GreenBox).
///         Build-day ships the dev stub: a role-gated setter plus deterministic on-chain math —
///         no external calls, so tests are hermetic and there is nothing to spoof in isolation.
///         Production wires Chainlink aggregators (CTO decision, box-specs §13).
/// @dev    Non-upgradeable for build day; UUPS later if a price-feed upgrade becomes necessary.
contract TokenPricer is AccessControl, ITokenPricer {
    bytes32 public constant PRICER_ROLE = keccak256("PRICER_ROLE");

    uint256 internal constant HEARTBEAT_SECONDS = 1 hours; // freshness window in seconds (matches block.timestamp units)
    uint80 private constant MAX_WHOLE_PRICE_1E8 = type(uint80).max / 1e8; // ~1.2e30 USD — any sane whole-token price fits with margin

    struct Price {
        uint8 decimals;
        uint80 priceUSDPerWhole; // whole-token value in USD at 1e8 precision
        uint32 updatedAt;       // block.timestamp (seconds) the feed was last refreshed
    }

    mapping(address => Price) private _prices;

    event PriceUpdated(address indexed token, uint256 priceUSDPerWhole, uint8 decimals, uint32 at);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        // Deployer keeps pricing until the Chainlink oracle wiring lands.
        _grantRole(PRICER_ROLE, admin);
    }

    /// @notice Set a token's USD price per whole (1e8). Sourced off-chain (Chainlink) in prod;
    ///         kept on-chain here so builds/tests never depend on live RPCs.
    function setPrice(address token, uint256 priceUSDPerWhole, uint8 decimals_) external onlyRole(PRICER_ROLE) {
        require(token != address(0), "TokenPricer: zero token");
        require(decimals_ >= 1 && decimals_ <= 36, "TokenPricer: bad decimals");
        // Bound before the uint80 cast so an oversized input reverts loudly instead of truncating silently.
        require(priceUSDPerWhole <= MAX_WHOLE_PRICE_1E8, "TokenPricer: price too large for uint80@1e8");
        _prices[token] = Price({decimals: decimals_, priceUSDPerWhole: uint80(priceUSDPerWhole), updatedAt: uint32(block.timestamp)});
        emit PriceUpdated(token, priceUSDPerWhole, decimals_, uint32(block.timestamp));
    }

    /// @notice USD value of `amount` (token-native units) for `token`, at 1e8. Reverts if unknown or stale.
    function getUSDValue(address token, uint256 amount) public view returns (uint256 usd1e8) {
        Price storage p = _prices[token];
        require(p.decimals != 0, "TokenPricer: unknown token");
        _requireFresh(token); // freshness guard in seconds
        usd1e8 = (amount * uint256(p.priceUSDPerWhole)) / 10 ** uint256(p.decimals); // whole-value(1e8) scaled by fraction of a whole
    }

    /// @notice Current USD price of one WHOLE `token` at 1e8. Reverts if unknown or stale.
    ///         Implements ITokenPricer (box-specs: Chainlink-style feed).
    function price(address token) external view returns (uint256 usd1e8) {
        Price storage p = _prices[token];
        require(p.decimals != 0, "TokenPricer: unknown token");
        _requireFresh(token); // freshness guard in seconds
        usd1e8 = uint256(p.priceUSDPerWhole);
    }

    /// @notice Whole-token USD at 1e8 plus stored decimals.
    function priceOf(address token) external view returns (uint256 usdPerWhole1e8, uint8 decimals_) {
        Price storage p = _prices[token];
        require(p.decimals != 0, "TokenPricer: unknown token");
        usdPerWhole1e8 = uint256(p.priceUSDPerWhole);
        decimals_ = p.decimals;
    }

    function isFresh(address token) public view returns (bool) {
        Price storage p = _prices[token];
        return p.decimals != 0 && block.timestamp >= uint256(p.updatedAt) && (block.timestamp - uint256(p.updatedAt)) <= HEARTBEAT_SECONDS;
    }

    /// @dev Freshness guard: reject prices older than HEARTBEAT_SECONDS (seconds, matching block.timestamp).
    function _requireFresh(address token) internal view {
        Price storage p = _prices[token];
        require(block.timestamp >= uint256(p.updatedAt), "TokenPricer: clock skew");
        require(block.timestamp - uint256(p.updatedAt) <= HEARTBEAT_SECONDS, "TokenPricer: stale price");
    }
}
