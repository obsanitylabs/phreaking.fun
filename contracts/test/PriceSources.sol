// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {TokenPricer} from "../src/TokenPricer.sol";
import {RolePriceSource} from "../src/RolePriceSource.sol";

/// @dev Two independent keepers that publish the same quote. Tests that only care about a price
///      use this so they do not have to wire redundancy themselves.
contract DualQuote {
    TokenPricer public pricer;
    RolePriceSource public primary;
    RolePriceSource public secondary;
    address public keeperA;
    address public keeperB;

    function deploy(address admin, address keeperA_, address keeperB_) external returns (TokenPricer) {
        keeperA = keeperA_;
        keeperB = keeperB_;
        primary = new RolePriceSource(address(this));
        secondary = new RolePriceSource(address(this));
        pricer = new TokenPricer(admin, primary, secondary);
        primary.grantRole(primary.KEEPER_ROLE(), keeperA_);
        secondary.grantRole(secondary.KEEPER_ROLE(), keeperB_);
        // This helper publishes both quotes. It is not a production keeper.
        primary.grantRole(primary.KEEPER_ROLE(), address(this));
        secondary.grantRole(secondary.KEEPER_ROLE(), address(this));
        primary.grantRole(primary.DEFAULT_ADMIN_ROLE(), admin);
        secondary.grantRole(secondary.DEFAULT_ADMIN_ROLE(), admin);
        return pricer;
    }

    function quote(address token, uint256 priceUSDPerWhole, uint8 decimals_) external {
        primary.setQuote(token, priceUSDPerWhole, decimals_);
        secondary.setQuote(token, priceUSDPerWhole, decimals_);
    }
}
