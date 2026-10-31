// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPriceSource} from "../src/interfaces/IPriceSource.sol";

/// @dev A price source whose quote is set by an open (role-free) publisher. Lets the fuzz campaign
///      drive divergence / staleness / zero-quote scenarios deterministically that RolePriceSource
///      (which gate setters to KEEPER_ROLE and forbid zero prices) cannot express.
contract MockSource is IPriceSource {
    uint256 public price;
    uint8 public decimals;
    uint256 public updatedAt;

    function publish(address, uint256 _price, uint8 _decimals) external {
        price = _price;
        decimals = _decimals;
        updatedAt = block.timestamp;
    }

    function quote(address) external view returns (uint256, uint8, uint256) {
        return (price, decimals, updatedAt);
    }
}
