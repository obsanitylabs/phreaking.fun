# phreaking.fun box contracts (Foundry)

Build reference: OBS-129 `box-specs` issue document (Drive developer guides + CEO build decisions).
Branch: `build-day-boxes`. No mainnet deployment, no keys — Sepolia/local testing only.

## Contract map → Drive guide

| File | Box / primitive | Guide section | Notes |
| --- | --- | --- | --- |
| `src/MysteryBoxBase.sol` | Abstract base for every box | one-pager §1 (security invariants) | guardian pause in 1 tx, timelocked unpause (24h), USD per-tx / total-VaR / per-wallet caps, CEI + ReentrancyGuard + SafeERC20 deposit pipeline. Remediation of OBS-128 M-4 lives here. |
| `src/RedBox.sol` | Red Box — 1:1 swap | §2 "Red Box" | whole token in → same-value whole token out; native/cross-chain via executor |
| `src/BlueBox.sol` | Blue Box — $-for-$ ±1% slippage, multi-token lots | §2 "Blue Box" | pool XCM/wTHT/PEAR/RIO/LINK/MKR/GFI/ITGR |
| `src/GreenBox.sol` | Green Box — Shitcoin Recycler | §2 "Green Box" | criteria (<2yr old, ≥$100k avg daily vol / 90d) enforced by executor from deposit-time USD value |
| `src/MysteryBox.sol` | Mystery Box core (MYSTERY pool) | one-pager §1 | generic mystery variant of the base |
| `src/WhiteBox.sol` | White Box — charity donation via TheGivingBlock | §2 "White Box" | anonymous USDC donation, no tax receipt; confirm-page copy in guide |
| `src/OrangeBox.sol` | Orange Box — dust → WBTC | one-pager §1 (Shit to Bit) | consolidates dust into WBTC via executor |
| `src/YellowBox.sol` | Yellow Box — convert all coins to BNB | one-pager §1 | thin variant; mechanics per guide list line "Yellow: convert all coins to BNB" |
| `src/PinkBox.sol` | Pink Box — stablecoin TWAP strategy | CEO decision 5b | thin variant pending spec confirmation (no guide in materials) |
| `src/PurpleBox.sol` | Purple Box — NFT ↔ altcoin swap | one-pager §1 (NFT to Shitcoin Highway) | NFT adapter delegated off-chain |
| `src/RainbowBox.sol` | Rainbow Box — randomly triggers any other box | one-pager §1 | randomness via VRF/commit-reveal in executor; contract delegates |
| `src/BlackBox.sol` | Black Box — Rage Quit + Harold NFT | §2 "Black Box" | deposit sink only on-chain; Secret Network/Monero path is off-chain operational and never a privileged contract path |
| `src/CheckeredBox.sol` | Checkered Box — two-party portfolio shuffle | one-pager §1 | escrow/matching delegated to executor |
| `src/SilverBox.sol` | Silver Mirror — majors/mids copy trade | §2 "Silver Mirror" | whitelist + weights are configuration, not hardcoded constants |
| `src/GoldBox.sol` | Gold Mirror — microcaps copy trade | §2 "Gold Mirror" | same architecture as Silver with its own pool config |
| `src/DiamondBox.sol` | Diamond Mirror — 1000x or Death | §2 "Diamond Mirror" | TWAP over 24h via executor; ≤1% slippage per coin |
| `src/RussianFlagBox.sol` | Russian Flag — GMX long/short strategy vault | one-pager §1 | fee tiers (13%/15%/22%) + 24h close delegated to strategy adapter off-chain |
| `src/CoinGatchaBox.sol` | CoinGatcha — claw machine, $1/$10/$100 grabs | §2 "CoinGatcha" | static prize inventory; 3% markup + 10% gas premium via FeeManager semantics in executor |
| `src/ReferralToken.sol` | Dummy referral token (Polygon) | one-pager §1 "Referrals", decision h | ERC-20, 18 decimals, immutable maxSupply backstop; MINTER_ROLE-only mint/burn |
| `src/ReferralRegistry.sol` | Referral registry + free Red Box swap redemption | one-pager §1 "Referrals" | referee self-registers once → uplink credited 1 whole token (1:1 MATIC peg); pull-only redemption burns the token and emits `FreeSwapGranted` for off-chain settlement; guardian pause/timelocked unpause same as base |
| `src/BoxTokenRegistry.sol` | Per-box token pools + decimals + activation | decision 4 (`BoxRegistry`) | admin-managed configuration, no fund-movement surface |
| `src/TokenPricer.sol` | Whole-token USD price feed (1e8) | decision 4 (`OracleAdapter`) | seconds-based freshness window; non-upgradeable for build day (UUPS later) |
| `src/interfaces/IBoxExecutor.sol` | Trusted off-chain executor interface | decision 3/5 | all DEX routing, bridging (Axelar/Synapse), VRF, Secret/Monero paths settle here — stubbed today |
| `src/interfaces/IBox.sol`, `IERC20.sol`, `ITokenPricer.sol` | Supporting interfaces | — | local declarations matching deployed ABI conventions |

## Trust model (documented per build decision 6)

- Contracts hold deposits only during the atomic deposit→executor dispatch. Every deposit is forwarded to
  the executor in the same transaction (OBS-185):
  - Native deposits (`tokenIn == address(0)`) forward `msg.value == amount` to the payable
    `IBoxExecutor.execute`; the executor must implement `receive()`.
  - ERC20 deposits use a PULL model: the box grants `forceApprove(executor, amount)` immediately before the
    call and resets the allowance to zero immediately after, so the executor pulls the exact deposit and no
    standing approval (or stranded balance) exists between deposits. `msg.value` must be zero on this branch.
  Settlement, DEX routing, cross-chain bridging, VRF randomness and the Black-box Secret/Monero path live in
  the trusted off-chain `IBoxExecutor`; contracts never route user funds themselves outside that delegation.
- There is deliberately no sweep/rescue path: no admin can move user principal. Deposits are expected to leave
  the box within the atomic deposit transaction, not accumulate.
- No privileged path moves user principal: admin roles manage caps/pools/executor only; fees (where any) go
  through explicit event-emitting collection to an immutable treasury sink.
- Emergency pause is reachable by the on-call guardian in one transaction on every contract exposing it;
  unpause is timelocked (24h) and permissionless-to-release after the delay — an emergency pause can only be
  lifted on schedule.

## Referral program deployment note

Deploy order: `ReferralToken` → `ReferralRegistry(token, admin)` → grant `MINTER_ROLE` on the token to the
registry address (admin). Set per-referrer reward cap via `setMaxRewardsPerReferrer` if desired (0 = unlimited;
the immutable token supply cap always remains as the hard backstop).

## Deployment script (Phase 2 — Sepolia)

`script/Deploy.s.sol` deploys the full fleet in one atomic sequence with bounded-launch wiring: guardian pause
roles, CFO-signed caps at deploy time, known Sepolia tokens registered (`USDC.e`/WETH/LINK), and a final step
that transfers every `DEFAULT_ADMIN_ROLE` to the multisig and renounces the deployer EOA.

```shell
ADMIN=<deployer-EOA-address> MULTISIG=<2of3-multisig> GUARDIAN=<on-call-guardian> \
VAR_CAP_USD=<usd1e8> TX_CAP_USD=<usd1e8> WALLET_CAP_USD=<usd1e8> REFERRAL_MAX_SUPPLY=<optional-wei> \
forge script script/Deploy.s.sol --rpc-url <sepolia-rpc> --broadcast --private-key $DEPLOY_KEY
```

`ADMIN` must be the address of `$DEPLOY_KEY`: this Foundry version replays each `vm.startBroadcast()` call as a
signed transaction from that key, so constructor admin roles and all setup calls execute as it. Caps left unset
deploy at 0 (= unlimited) — the script logs a loud warning; set them before launch per the deployment package.

## Tests

```shell
$ forge test    # 62 passed / 0 failed across 12 suites
```

Covers: pause-in-one-tx, timelocked unpause, tx/total-VaR/wallet caps, role gating (OZ v5 custom errors), CEI
deposit flow with mock executor, OBS-185 fund-forwarding integration (settling executor pulls the exact ERC20
deposit with no standing allowance, native value reaches the executor, and ETH attached to an ERC20 deposit
reverts), price freshness/staleness + truncation guard, registry pool membership and
deactivation, referral registration/reward caps/supply cap/redemption burn/pause controls, plus the fleet-wide
emergency-stop drill (`FleetDrill.t.sol`): guardian sweeps a one-tx pause over all 17 boxes + referral registry,
deposit blocked while paused, non-guardian cannot touch pause/unpause, timelocked recovery after 24h.

## Build tooling

```shell
$ forge build && forge test && forge fmt
```

Compiler: solc 0.8.26, evm `paris`, via-IR (required for OZ v5 custom errors; CI timeout budget to be checked).
Dependencies vendored as submodules under `lib/` (`forge-std`, OpenZeppelin v5.3.0).
