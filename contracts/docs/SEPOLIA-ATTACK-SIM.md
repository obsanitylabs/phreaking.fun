# Sepolia attack simulation — phreaking.fun box fleet

Status: engineering-ready for the Chief Auditor and an operator to execute. **No deployment, no keys, no
mainnet action happen in this document or the PR that added it.** Every scenario below is also encoded as a
runnable Foundry test in [`test/AttackSim.t.sol`](../test/AttackSim.t.sol) so the same expectations can be
replayed in CI without a network.

Local replay (no RPC, hermetic):

```shell
cd contracts
forge test --match-path test/AttackSim.t.sol -vv
```

Audience: Chief Auditor (verify expectations match the deployed bytecode) and an operator (run each tx
sequence against the Sepolia fleet with their own funded key and record the observed result).

---

## 1. Fleet under test

| Contract | Address (fill at deploy) | Notes |
| --- | --- | --- |
| `BoxTokenRegistry` | `0x…` | pools + decimals + activation |
| `TokenPricer` | `0x…` | USD prices, 1h heartbeat |
| `MysteryBox` … `CoinGatchaBox` (17) | `0x…` ×17 | each has `GUARDIAN_ROLE`, caps, one `executor` |
| `ReferralToken` / `ReferralRegistry` | `0x…` | referral rewards + free-swap redemption |

All 17 boxes extend `MysteryBoxBase`, so the invariants below are inherited uniformly unless a scenario says
otherwise.

## 2. Trust model (read before executing)

- **Executor is trusted.** It is invoked last in each deposit's CEI sequence and settles off-chain (DEX
  routing, bridging, VRF, Monero paths). It must:
  - accept native value on `execute` (the box forwards the deposit's `msg.value`), and
  - pull exactly `amount` of the ERC20 via the **one-shot allowance** the box grants immediately before the
    call and resets to zero immediately after, and
  - pay `user` atomically, returning a **non-zero** output token address.
- **Price keeper(s) are trusted.** `TokenPricer.PRICER_ROLE` sets USD prices. A manipulated price changes cap
  accounting; a stale price reverts by design; a zero price is now rejected at the setter.
- **Admin/guardian are trusted but bounded.** No privileged path moves user funds; admin manages
  caps/pools/executor/roles, guardian can only pause (single tx) and queue a timelocked unpause.

## 3. Preconditions for a Sepolia run

1. Fleet deployed by `script/Deploy.s.sol` with `EXECUTOR` set (see `contracts/README.md`).
2. For each scenario, the target box's pool contains the test token **and** the token is registered/active.
   The local helper registers a mock ERC20 and native ETH (`address(0)`) in the `MYSTERY` pool.
3. A throwaway funded EOA (the "attacker") and a separate "user" EOA.
4. The operator records, per row: tx hash, gas, revert reason/selector, and the post-state assertion result.

## 4. Scenario matrix

Legend: **Setup** = precondition state; **Tx seq** = ordered calls; **Expected** = revert/assertion;
**Pass** = criterion the Chief Auditor accepts.

### S1 — Reentrancy via malicious token (ERC20 path)

- **Setup:** register an attacker ERC20 whose `transferFrom` calls back into `box.deposit`.
- **Tx seq:** attacker approves the box, calls `deposit(amount, attackerToken)`.
- **Expected:** revert `ReentrancyGuardReentrantCall()` from the reentrant deposit; outer tx reverts; no
  `DepositReceived`/cap change persists.
- **Pass:** inner reentrant deposit cannot execute; user balance and `totalValueAtRisk` unchanged.
- **Runnable:** `test_Reentrancy_Erc20ViaToken_Reverts`.

### S2 — Reentrancy via malicious executor (ERC20 and native)

- **Setup:** configure a malicious executor whose `execute` re-enters `box.deposit`.
- **Tx seq:** deposit ERC20 (`S2a`), then deposit native ETH (`S2b`).
- **Expected:** both revert `ReentrancyGuardReentrantCall()`.
- **Pass:** `ReentrancyGuard` covers both value paths; executor cannot recurse.
- **Runnable:** `test_Reentrancy_Erc20ViaExecutor_Reverts`, `test_Reentrancy_NativeViaExecutor_Reverts`.

### S3 — Allowance window / standing-approval regression

- **Setup:** a settling executor; fund and approve the user.
- **Tx seq:** `deposit(amount, token)` succeeds.
- **Expected:** `token.allowance(box, executor) == 0` immediately after the tx.
- **Pass:** no standing allowance exists between deposits (OBS-185 pull model intact).
- **Runnable:** `test_Allowance_ResetToZero_AfterDeposit`.

### S4 — Cap bypass via price manipulation / stale / zero price

- **S4a zero price — Setup:** `PRICER_ROLE` calls `setPrice(token, 0, 18)`.
  **Expected:** revert `TokenPricer: zero price`. **Pass:** a zero quote can never price deposits at $0.
- **S4b stale price — Setup:** set a price, set `perTransactionCap`, advance time > 1h.
  **Tx seq:** `deposit`. **Expected:** revert `TokenPricer: stale price`. **Pass:** stale quotes cannot be
  used to under-count value.
- **S4c manipulated price (accepted, trusted keeper):** a keeper can lower a price to fit under caps. This
  is an inherent trust assumption, **not** an on-chain bug; mitigation is keeper governance + monitoring, and
  the tx/VaR/wallet caps remain enforced against whatever the live price is.
- **Runnable:** `test_ZeroPrice_Rejected`, `test_StalePrice_Deposit_Reverts`.

### S5 — Pause bypass and stale unpause-queue manipulation

- **S5a — Setup:** guardian pauses. **Tx seq:** `deposit`. **Expected:** `EnforcedPause()`. **Pass:** no
  deposit path (including `WhiteBox.donate`) is reachable while paused.
- **S5b stale queue — Setup:** unpaused. **Tx seq:** guardian calls `queueUnpause()`.
  **Expected:** `ExpectedPause()`. **Pass:** a queue created before a later pause cannot outlive it.
- **S5c no-cancelUnpause (known design) — Setup:** paused + queued. **Tx seq:** warp 24h, anyone calls
  `releaseUnpause()`, then guardian calls `pause()`.
  **Expected:** release succeeds permissionlessly; re-pause succeeds in one tx.
  **Pass:** the residual "no cancel" property is bounded — worst case the pause lifts on schedule and the
  guardian re-pauses immediately. Record this as an accepted risk with the mitigation.
- **Runnable:** `test_Pause_BlocksDeposit`, `test_StaleQueue_NotAllowedWhileUnpaused`,
  `test_NoCancelUnpause_ReleasesOnSchedule_GuardianCanRepause`.

### S6 — Native `msg.value` mismatch and ETH attached to ERC20 deposits

- **S6a — Setup:** user funded with ETH. **Tx seq:** `deposit{value: excess}` and `deposit{value: deficit}`
  for `tokenIn == address(0)`. **Expected:** `MysteryBoxBase: msg.value mismatch`.
- **S6b — Setup:** ERC20 approved. **Tx seq:** `deposit{value: 1 ether}(amount, erc20)`.
  **Expected:** `MysteryBoxBase: msg.value must be zero`.
- **S6c bare transfer — Tx seq:** `box.call{value: x}("")`. **Expected:** revert (no `receive()`).
- **Pass:** ETH can never sit unattributed in any box (OBS-128 H-1 stranding fix holds).
- **Runnable:** `test_NativeValue_Excess_Reverts`, `test_NativeValue_Deficit_Reverts`,
  `test_EthAttachedToErc20Deposit_Reverts`, `test_BareNativeTransfer_Reverts`.

### S7 — Executor that fails to pull funds / returns zero

- **S7a non-pulling ERC20 — Setup:** executor returns an output but never pulls. **Tx seq:** `deposit`.
  **Expected:** tx succeeds (the allowance is still reset), deposit is **stranded in the box** with no sweep
  path. **Pass:** behaviour is pinned and documented as a known operational risk — the executor MUST pull;
  any future recovery path is a deliberate, audited change.
- **S7b reverting executor — Setup:** executor always reverts. **Tx seq:** `deposit`.
  **Expected:** revert; user balance and box balance unchanged. **Pass:** a failing settlement rolls back
  cleanly; nothing is stranded.
- **S7c zero output — Setup:** executor returns `address(0)`. **Tx seq:** `deposit` on every box variant.
  **Expected:** revert `"<Box>: no output token returned"` on all 17. **Pass:** no variant silently swallows a
  deposit. (The 12 previously-unguarded variants were hardened in this PR.)
- **Runnable:** `test_NonPullingExecutor_StrandsErc20InBox`, `test_RevertingExecutor_Deposit_RevertsCleanly`,
  `test_AllGuardedVariants_RejectZeroOutput`.

### S8 — Registry / pool misconfiguration

- **S8a not-in-pool — Tx seq:** `deposit` a registered token absent from the box pool.
  **Expected:** `MysteryBoxBase: token not usable in pool`.
- **S8b deactivated — Setup:** `registry.setActive(token, false)`. **Tx seq:** `deposit`.
  **Expected:** `token not usable in pool`.
- **S8c unregistered — Tx seq:** `deposit` a never-registered token. **Expected:** same revert.
- **Pass:** no token outside the active pool membership is ever accepted.
- **Runnable:** `test_TokenNotInPool_Reverts`, `test_DeactivatedToken_Reverts`,
  `test_UnregisteredToken_Reverts`.

### S9 — Referral self-referral / farming

- **S9a self-referral — Tx seq:** `register(self)`. **Expected:** `ReferralRegistry: self-referral`.
- **S9b double registration — Tx seq:** `register(upline)` twice from the same referee.
  **Expected:** `already registered` on the second.
- **S9c referrer cap — Setup:** `setMaxRewardsPerReferrer(1)`. **Tx seq:** two referees register the same
  upline. **Expected:** second reverts `referrer reward cap reached`.
- **S9d redeem with no rewards — Tx seq:** `redeemFreeSwap`. **Expected:** `no referral tokens to redeem`.
- **S9e double redeem — Tx seq:** redeem once, then again. **Expected:** second reverts
  `no referral tokens to redeem` (token burned on first).
- **S9f supply cap — Setup:** small `maxSupply`. **Tx seq:** register until cap exceeded.
  **Expected:** mint reverts `ReferralToken: supply cap reached`.
- **Pass:** one reward per referee, per-referrer cap bounds farming, immutable supply cap bounds exposure.
- **Runnable:** `test_Referral_SelfReferral_Reverts`, `test_Referral_DoubleRegistration_Reverts`,
  `test_Referral_ReferrerCap_BlocksFarming`, `test_Referral_RedeemWithoutRewards_Reverts`,
  `test_Referral_DoubleRedeem_Reverts`, `test_Referral_SupplyCap_Enforced`.

### S10 — Role escalation / admin-handoff mistakes in the deploy script

- **Setup:** run `Deploy.s.sol` with `ADMIN`, `MULTISIG`, `GUARDIAN`, `EXECUTOR`.
- **Assertions after the broadcast:**
  1. `EXECUTOR` is the configured address on **all 17** boxes (`ExecutorChanged` emitted 17×).
  2. The deployer EOA holds **no** `DEFAULT_ADMIN_ROLE` on any contract.
  3. `MULTISIG` holds `DEFAULT_ADMIN_ROLE` on every contract.
  4. `GUARDIAN_ROLE` is held by the guardian on every pausable contract; the deployer holds none.
  5. The deployer cannot `setExecutor` / `setRole` after handoff (call reverts
     `AccessControlUnauthorizedAccount`).
- **Pass:** a fresh deployment is deposit-ready (executors set) and the EOA has zero residual privilege.
- **Runnable:** `test_DeployScript_WiresExecutorOnAll17Boxes_AndHandsOffAdmin` (runs the real script and
  asserts the 17 `ExecutorChanged` emissions). Assertions 2–5 are the manual post-deploy checklist in §5.

## 5. Sepolia rehearsal procedure (operator)

Do not paste keys anywhere. Run from a shell with local env only.

1. Deploy with the executor:
   ```shell
   ADMIN=<deployer-eoa> MULTISIG=<2of3> GUARDIAN=<guardian> EXECUTOR=<executor-contract> \
   VAR_CAP_USD=<usd1e8> TX_CAP_USD=<usd1e8> WALLET_CAP_USD=<usd1e8> \
   forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC --broadcast --private-key $DEPLOY_KEY
   ```
2. Confirm `ExecutorChanged` on all 17 boxes and that `hasRole(DEFAULT_ADMIN_ROLE, multisig) == true` for
   every contract while the deployer EOA returns `false` (assertions 2–5 above).
3. Configure one test box's pool with a Sepolia ERC20 (and native) and seed the price with `PRICER_ROLE`.
4. Walk S1–S10, recording tx hash + observed revert/selector + post-state assertion per row.
5. Store the filled matrix alongside the deployment package; the Chief Auditor signs it against the
   deployed bytecode.

## 6. Accepted risks (explicit)

| Risk | Why accepted | Mitigation |
| --- | --- | --- |
| Trusted executor can misroute a settled deposit | All routing is off-chain by design (build-day scope) | Executor contract reviewed separately; caps bound exposure; rotation is one `setExecutor` per box |
| Non-pulling executor strands ERC20 in a box | No recovery path exists today (pinned by S7a) | Executor MUST pull; monitor box balances; any sweep is a deliberate audited change |
| No `cancelUnpause` | Keeps the timelock anchored to a live pause | Guardian re-pauses in one tx after release (S5c) |
| Trusted keeper can lower prices to fit under caps | Oracle is a trusted role | Keeper governance + price monitoring; zero price now rejected (S4a) |
| Referral `FreeSwapGranted` settled off-chain | Redemption is pull-only, no funds held | Off-chain executor consumes the event; supply cap bounds program exposure |
