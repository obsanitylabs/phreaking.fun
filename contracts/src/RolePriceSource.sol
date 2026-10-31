// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IPriceSource} from "./interfaces/IPriceSource.sol";

/// @notice Role-gated price source. Production deploys two of these and assigns KEEPER_ROLE to
///         different operators (or replaces one with a Chainlink adapter of the same interface).
///         A single compromised keeper can move only its own source, which the redundant pricer rejects.
contract RolePriceSource is AccessControl, IPriceSource {
    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint80 private constant MAX_WHOLE_PRICE_1E8 = type(uint80).max / 1e8;

    struct Quote {
        uint8 decimals;
        uint80 priceUSDPerWhole;
        uint64 updatedAt;
    }

    mapping(address => Quote) private _quotes;

    event QuoteUpdated(address indexed token, uint256 priceUSDPerWhole, uint8 decimals, uint64 at);

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _setRoleAdmin(KEEPER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /// @dev `token == address(0)` is the native-Ether convention used by the boxes.
    function setQuote(address token, uint256 priceUSDPerWhole, uint8 decimals_) external onlyRole(KEEPER_ROLE) {
        require(decimals_ >= 1 && decimals_ <= 36, "RolePriceSource: bad decimals");
        require(priceUSDPerWhole <= MAX_WHOLE_PRICE_1E8, "RolePriceSource: price too large");
        require(priceUSDPerWhole > 0, "RolePriceSource: zero price");
        _quotes[token] = Quote({
            decimals: decimals_,
            priceUSDPerWhole: uint80(priceUSDPerWhole),
            updatedAt: uint64(block.timestamp)
        });
        emit QuoteUpdated(token, priceUSDPerWhole, decimals_, uint64(block.timestamp));
    }

    function quote(address token) external view returns (uint256 usdPerWhole1e8, uint8 decimals_, uint256 updatedAt) {
        Quote storage q = _quotes[token];
        usdPerWhole1e8 = uint256(q.priceUSDPerWhole);
        decimals_ = q.decimals;
        updatedAt = uint256(q.updatedAt);
    }
}
