// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @notice Per-box token pools, decimals and activation status. Admin-managed; the box contracts
///         only ever interact with tokens that are active in their own pool.
/// @dev    No fund-movement surface here — configuration only (bounded-launch invariant).
///         Non-upgradeable for build day; UUPS later if needed. MYSTERY is an additive enum value
///         appended after RED/BLUE/GREEN so existing numeric indices stay stable.
contract BoxTokenRegistry is AccessControl {
    enum BoxType { RED, BLUE, GREEN, MYSTERY, WHITE, ORANGE, YELLOW, PINK, PURPLE, RAINBOW, BLACK, CHECKERED, SILVER, GOLD, DIAMOND, RUSSIAN_FLAG, COINGATCHA }

    struct TokenInfo {
        uint8 decimals;
        bool active; // deactivable without removing from the pool (price feeds may go stale)
    }

    mapping(address token => TokenInfo) public info;
    mapping(BoxType box => mapping(address token => bool)) public inPool;

    event TokenRegistered(address indexed token, uint8 decimals);
    event PoolMembershipChanged(BoxType indexed box, address indexed token, bool added);
    event TokenActivated(address indexed token, bool active);

    error DuplicateToken();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Register a token's decimals. Re-registers revert (use setActive for fixes).
    function registerToken(address token, uint8 decimals_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(info[token].decimals == 0 && !info[token].active, DuplicateToken());
        // decimals == 0 is the unregistered sentinel. A real 0-decimal token cannot be represented.
        require(decimals_ != 0 && decimals_ <= 36, "BoxTokenRegistry: bad decimals");
        info[token] = TokenInfo(decimals_, true);
        emit TokenRegistered(token, decimals_);
    }

    /// @notice Add or remove a token from a box pool.
    function setPoolMembership(BoxType box, address token, bool added) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(info[token].decimals != 0, "BoxTokenRegistry: unregistered token");
        inPool[box][token] = added;
        emit PoolMembershipChanged(box, token, added);
    }

    /// @notice Activate/deactivate a registered token (e.g. stale price feed).
    function setActive(address token, bool active) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(info[token].decimals != 0, "BoxTokenRegistry: unregistered token");
        info[token].active = active;
        emit TokenActivated(token, active);
    }

    /// @notice True when `token` is registered, active AND in the given box's pool.
    function canUse(address token, BoxType box) external view returns (bool) {
        TokenInfo memory t = info[token];
        return t.decimals != 0 && t.active && inPool[box][token];
    }

    /// @notice Token decimals as stored by the registry.
    function decimalsOf(address token) public view returns (uint8) {
        return info[token].decimals;
    }
}
