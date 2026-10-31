// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title ReferralToken
/// @notice Dummy referral token (product one-pager §1 "Referrals", build decision h). Each whole token is
///         pegged 1:1 to MATIC in a private Polygon pool and entitles the holder to exactly one free Red Box
///         swap. Minted only for referrers by ReferralRegistry; redeemed (burned) back through it.
/// @dev    Bounded-launch backstops: immutable maxSupply hard-caps total program exposure, and mint/burn are
///         restricted to MINTER_ROLE (granted once to the registry at deployment). No other privileged surface.
contract ReferralToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER");

    uint256 public immutable maxSupply;

    constructor(address admin_, uint256 maxSupply_) ERC20("Phreaking Referral", "PHRFD") {
        require(maxSupply_ > 0, "ReferralToken: zero supply cap");
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
        maxSupply = maxSupply_;
    }

    /// @notice Mint reward tokens to a referrer. Callable only by the registry (MINTER_ROLE).
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(to != address(0), "ReferralToken: zero recipient");
        require(totalSupply() + amount <= maxSupply, "ReferralToken: supply cap reached");
        _mint(to, amount);
    }

    /// @notice Burn redeemed reward tokens from `account`. Callable only by the registry (MINTER_ROLE).
    ///         Spends `account`'s allowance to this contract, so a transfer of the reward token does not
    ///         let the original earner (or anyone else) burn another holder's balance.
    function burnFrom(address account, uint256 amount) external onlyRole(MINTER_ROLE) {
        require(account != address(0), "ReferralToken: zero account");
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }
}
