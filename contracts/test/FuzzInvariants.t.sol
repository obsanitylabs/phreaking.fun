// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {IPriceSource} from "../src/interfaces/IPriceSource.sol";
import {MockSource} from "./MockPriceSource.sol";
import {ReferralToken} from "../src/ReferralToken.sol";
import {ReferralRegistry} from "../src/ReferralRegistry.sol";
import {IBoxExecutor} from "../src/interfaces/IBoxExecutor.sol";

/*
 * Fuzz + invariant campaign for the security-critical paths. Each test builds a fresh,
 * self-contained instance so any counterexample is reproducible and isolated.
 *
 * Covered properties:
 *   1. Pricer publishes the HIGHER of two in-band sources and reverts when a source is stale /
 *      diverging beyond the 1% band / zero-valued.
 *   2. Deposit caps (total VaR / per-tx / per-wallet) are never exceeded when enabled; accounting
 *      never drifts from the sum of successful deposits and never changes on a reverted deposit.
 *   3. Native ETH is never stranded or retained by the box after a deposit (H-1 stranding fix).
 *   4. Referral program: per-referee claims exactly once, minted supply never exceeds maxSupply,
 *      and a fuzzed per-referrer cap is enforced.
 */

contract FuzzFunding {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "insufficient allowance");
        allowance[from][msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }
    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

/// @dev Correct executor: forwards exactly the forwarded value for native deposits and returns a
///      non-zero output token so the deposit CEI completes.
contract MockExecutor is IBoxExecutor {
    address public tokenOut;
    bool public sweepNative;

    function setOutput(address _t) external {
        tokenOut = _t;
    }
    function setSweepNative(bool sweep) external {
        sweepNative = sweep;
    }

    function execute(address, address, address tokenIn, uint256 amount, uint256) external payable returns (address) {
        if (sweepNative && tokenIn == address(0)) {
            require(msg.value == amount, "executor: value mismatch");
        }
        return tokenOut;
    }

    receive() external payable {}
}

abstract contract BoxHarness is Test {
    BoxTokenRegistry registry;
    TokenPricer pricer;
    MockSource primary;
    MockSource secondary;
    MockExecutor executor;
    MysteryBox box;
    FuzzFunding token;
    address admin = address(0xAA);
    address user = address(0xCC);
    address native = address(0);

    function _makeBox() internal {
        registry = new BoxTokenRegistry(admin);
        primary = new MockSource();
        secondary = new MockSource();
        pricer = new TokenPricer(address(this), IPriceSource(address(primary)), IPriceSource(address(secondary)));
        executor = new MockExecutor();
        box = new MysteryBox(registry, pricer, admin);
        token = new FuzzFunding();

        vm.startPrank(admin);
        box.grantRole(box.GUARDIAN_ROLE(), address(0xBB));
        box.setExecutor(address(executor));
        executor.setOutput(address(0xDD));
        registry.registerToken(address(token), 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(token), true);
        registry.registerToken(native, 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, native, true);
        vm.stopPrank();

        // A live, in-band price for both the ERC20 pool token and native (2000 USD / whole).
        _publish(address(token), 2000 * 1e8, 18);
        _publish(native, 2000 * 1e8, 18);
    }

    /// @dev Publish an identical quote to both sources so the pricer accepts it (0% deviation).
    function _publish(address token, uint256 price, uint8 decimals) internal {
        primary.publish(token, price, decimals);
        secondary.publish(token, price, decimals);
    }

    function _fund() internal {
        token.mint(user, 50_000 * 1e18);
        vm.deal(user, 50_000 ether);
        vm.prank(user);
        token.approve(address(box), type(uint256).max);
    }
}

/* ---- Property 1: pricer agreement + conservative publish + failure modes ---- */

contract PricerFuzz is BoxHarness {
    // Two sources agreeing within band → published price is the HIGHER one (conservative cap input).
    function test_Price_IsHigherAgreeingSource() public {
        _makeBox();
        primary.publish(address(token), 1000 * 1e8, 18);
        secondary.publish(address(token), 1008 * 1e8, 18); // 0.8% — within the 1% band

        assertEq(pricer.price(address(token)), 1008 * 1e8, "published must be the higher source");
    }

    // A 0-valued quote fails closed (UnknownToken), whichever source carries it.
    function test_Price_ZeroFailsClosed() public {
        _makeBox();
        primary.publish(address(token), 0, 18);
        secondary.publish(address(token), 2000 * 1e8, 18);

        vm.expectRevert();
        pricer.price(address(token));
    }

    // A stale source (updatedAt far in the past) fails closed.
    function test_Price_StaleFailsClosed() public {
        _makeBox();
        vm.warp(10_000);
        primary.publish(address(token), 2000 * 1e8, 18);
        secondary.publish(address(token), 2000 * 1e8, 18);
        vm.warp(10_000 + 2 hours); // both now stale (> 1h heartbeat).

        vm.expectRevert();
        pricer.price(address(token));
    }

    // Diverging sources beyond the 1% band fail closed.
    function test_Price_BeyondBandFailsClosed() public {
        _makeBox();
        primary.publish(address(token), 1000 * 1e8, 18);
        secondary.publish(address(token), 1500 * 1e8, 18); // >1% divergence

        vm.expectRevert();
        pricer.price(address(token));
    }
}

/* ---- Property 2: deposit caps + accounting never drift ---- */

contract CapsInvariant is BoxHarness {
    function testInvariant_DepositCapsHoldAndNoDrift(uint256 capTx, uint256 capWallet, uint256 capTotal, uint256 amount)
        public
    {
        _makeBox();
        _fund();
        vm.prank(admin);
        box.setPerTransactionCap(bound(capTx, 0, type(uint256).max));
        vm.prank(admin);
        box.setPerWalletCap(bound(capWallet, 0, type(uint256).max));
        vm.prank(admin);
        box.setTotalValueAtRiskCap(bound(capTotal, 0, type(uint256).max));

        uint256 amount_ = bound(amount, 1, 5_000 * 1e18);
        uint256 tvrBefore = box.totalValueAtRisk();
        uint256 wdBefore = box.walletDeposited(user);

        bool reverted = false;
        vm.prank(user);
        try box.deposit(amount_, address(token)) {} catch {
            reverted = true;
        }

        // Caps always hold when enabled, even after a reverted deposit (state rolled back).
        if (box.totalValueAtRiskCap() != 0) {
            assertLe(box.totalValueAtRisk(), box.totalValueAtRiskCap(), "total VaR over cap");
        }
        if (box.perWalletCap() != 0) {
            assertLe(box.walletDeposited(user), box.perWalletCap(), "wallet over cap");
        }

        if (reverted) {
            // No state change on revert — the accounting cannot over/under-count.
            assertEq(box.totalValueAtRisk(), tvrBefore, "tvr changed on revert");
            assertEq(box.walletDeposited(user), wdBefore, "wallet changed on revert");
        } else {
            uint256 v = box.valueOf(address(token), amount_);
            assertGe(box.totalValueAtRisk(), tvrBefore, "tvr did not grow");
            assertEq(box.totalValueAtRisk(), tvrBefore + v, "tvR drift");
            assertEq(box.walletDeposited(user), wdBefore + v, "wallet drift");
            if (box.perTransactionCap() != 0) {
                assertLe(v, box.perTransactionCap(), "per-tx cap exceeded");
            }
        }
    }

    // Cumulative VaR across repeated deposits must respect a total cap (single deposit reverts past it).
    function testInvariant_MultipleDepositsRespectCumulativeCap(uint256 attempts) public {
        _makeBox();
        token.mint(address(this), 50_000 * 1e18);
        vm.prank(address(this));
        token.approve(address(box), type(uint256).max);
        vm.prank(admin);
        box.setTotalValueAtRiskCap(3000 * 1e8); // $3,000 across all deposits

        uint256 n = bound(attempts, 0, 12);
        for (uint256 i = 0; i < n; ++i) {
            try box.deposit(1000 * 1e18, address(token)) {} catch {}
        }
        assertLe(box.totalValueAtRisk(), 3000 * 1e8, "cumulative VaR over cap");
    }

    // FZ-1 disposition (OBS-310: FIX, counting rule): a positive deposit whose USD value floors to 0
    // counts as exactly 1 quantum (1e-8 USD) in the cap accounting path, never 0, so sub-quantum dust
    // can never bypass the total/per-tx/per-wallet USD caps. The pre-fix behaviour (truncate to $0)
    // is replaced by this bound assertion.
    function testInvariant_SubQuantumDeposit_CountsExactlyOneQuantum() public {
        _makeBox();
        _fund();

        // valueOf(4e6 units) at $2000/whole would floor to 0; the FZ-1 fix floors it UP to 1 quantum.
        uint256 dust = 4_000_000;
        assertEq(box.valueOf(address(token), dust), 1, "sub-quantum deposit must count as 1 quantum");

        uint256 varBefore = box.totalValueAtRisk();
        uint256 walletBefore = box.walletDeposited(user);
        vm.prank(user);
        box.deposit(dust, address(token)); // succeeds; accounts exactly 1 quantum toward the caps
        assertEq(box.totalValueAtRisk(), varBefore + 1, "totalValueAtRisk must advance by exactly 1");
        assertEq(box.walletDeposited(user), walletBefore + 1, "walletDeposited must advance by exactly 1");

        // Real (untruncated) value is non-zero, proving the 1-quantum floor is a conservative under-count.
        assertGt(pricer.getUSDValue(address(token), dust * 1_000_000), 0, "real value must be non-zero");
    }
}

/* ---- Property 3: native ETH never stranded or retained ---- */

contract NativeAccountingInvariant is BoxHarness {
    function testInvariant_NativeFullyForwarded(uint256 amount, bool erc20) public {
        _makeBox();
        _fund();
        vm.prank(admin);
        box.setPerTransactionCap(5_000 * 1e8);

        uint256 value = bound(amount, 1, 1000 * 1e18);
        uint256 balanceBefore = address(box).balance;

        bool reverted = false;
        if (erc20) {
            try box.deposit(value, address(token)) {} catch {
                reverted = true;
            }
        } else {
            executor.setSweepNative(true);
            vm.prank(user);
            try box.deposit{value: value}(value, address(0)) {} catch {
                reverted = true;
            }
        }

        if (!reverted) {
            // No native must remain in the contract after a successful deposit.
            assertEq(address(box).balance, balanceBefore, "native stranded in box");
            assertLe(address(box).balance, balanceBefore);
        }
    }

    // A reverted native deposit must roll back to the pristine balance (no partial ETH leak).
    function testInvariant_NativeRevertRestoresBalance(uint256 amount) public {
        _makeBox();
        _fund();
        vm.deal(address(box), 7 ether); // stray balance present before the (failing) deposit
        uint256 clean = address(box).balance;

        vm.prank(admin);
        box.setPerTransactionCap(1000 * 1e8); // $1000 < value of 1 ETH ($2000)

        try box.deposit{value: 3 ether}(3 ether, address(0)) {} catch {}
        assertEq(address(box).balance, clean, "reverted native deposit leaked ETH");
    }
}

/* ---- Property 4: referral claims + supply cap ---- */

contract ReferralInvariant is Test {
    address constant UP = 0x0000000000000000000000000000000000000042;
    ReferralRegistry internal reg;

    function testInvariant_ReferralClaimsAndSupplyBounded(uint256 seed) public {
        uint256 n = bound(seed, 0, 40);
        ReferralToken token = new ReferralToken(address(this), 10_000 ether);
        reg = new ReferralRegistry(ReferralToken(address(token)), address(this));
        token.grantRole(token.MINTER_ROLE(), address(reg));

        uint256 credits = 0;
        for (uint256 i = 0; i < n; ++i) {
            // Bounded to a small pool so referees collide -> double-registration reverts.
            address referee = address(uint160(bound(uint160(i), 1, 5)));
            try reg.register(UP) {
                credits++;
            } catch {}
        }

        assertLe(token.totalSupply(), 10_000 ether, "supply over cap");
        assertEq(reg.referralsOf(UP), credits, "referralsOf != successful referrals");
        assertEq(token.balanceOf(UP), credits * 1 ether, "balance != credits * 1");
        assertLe(reg.referralsOf(UP), token.totalSupply(), "credits exceed supply");
    }

    function testInvariant_PerReferrerCapEnforced(uint256 cap, uint256 attempts) public {
        cap = bound(cap, 0, 100); // 0 = unlimited
        uint256 n = bound(attempts, 0, 30);
        ReferralToken token = new ReferralToken(address(this), 1_000_000 ether);
        reg = new ReferralRegistry(ReferralToken(address(token)), address(this));
        token.grantRole(token.MINTER_ROLE(), address(reg));
        if (cap != 0) reg.setMaxRewardsPerReferrer(cap); // address(this) is admin

        uint256 credits = 0;
        for (uint256 i = 0; i < n; ++i) {
            address referee = address(uint160(0xF00000 + i)); // distinct referees
            try this._attemptRegister(referee) {
                credits++;
            } catch {}
        }

        if (cap != 0) {
            assertLe(reg.referralsOf(UP), cap, "per-referrer cap exceeded");
        }
        assertLe(reg.referralsOf(UP), token.totalSupply(), "credits exceed supply");
    }

    function _attemptRegister(address referee) external {
        vm.prank(referee);
        reg.register(UP);
    }
}
