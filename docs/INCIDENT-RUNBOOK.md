# phreaking.fun — Incident Runbook (Bounded-Launch Window)

Status: REVISED 2026-10-31 by Senior Solidity Engineer per OBS-338 (rebuilt, non-upgradeable fleet). **DRAFT — CISO review/approval is the next step and is required before go-live; this document is not yet approved.** Originally prepared 2026-10-29 per OBS-129.
Applies to the first 30 days of mainnet operation under bounded-launch caps (§ MAINNET-DEPLOYMENT-PACKAGE.md).

Severity: S1 = user funds at risk / cap breach / privileged function exploited. S2 = contract paused unexpectedly, integration failure with fund impact potential. S3 = degraded functionality, no fund risk.

## 1. Detection

Sources (all feed the on-call channel; the full privileged surface is listed in §8):
- On-chain alerts — the real detection surface of the rebuilt fleet:
  - Pause state change: `Paused` / `Unpaused` events, and any call to `pause()`, `queueUnpause()`, or `releaseUnpause()` on any box or on `ReferralRegistry`.
  - Role changes: `RoleGranted` / `RoleRevoked` for `DEFAULT_ADMIN_ROLE`, `GUARDIAN_ROLE`, the oracle `KEEPER_ROLE`, and the referral `MINTER_ROLE`.
  - Admin config changes: `ExecutorChanged`, `TotalValueAtRiskCapChanged`, `PerTransactionCapChanged`, `PerWalletCapChanged`, `MaxRewardsPerReferrerChanged`, `TokenRegistered`, `PoolMembershipChanged`, `TokenActivated`.
  - Cap pressure: a box's token balance or `totalValueAtRisk()` above 80 % of the total cap, or a single deposit near `perTransactionCap`.
  - Oracle health: `TokenPricer.isFresh(token)` false on a live pool (quote older than the 1 h heartbeat, > 1 % divergence between the two sources, or a missing quote).
  - Revert spikes in `deposit` / purchase / donate flows (frontend + RPC error reporting).
- Frontend error reporting + user reports (socials, support inbox) — any "I paid and got nothing" report is S1 until proven otherwise.
- Manual sweep: on-call checks contract balances vs caps once per shift.

## 2. Pause (target: within minutes — **< 10 minutes** from detection to paused state for S1)

On-chain pause mechanics (must match the rebuilt code — `MysteryBoxBase.sol:78-99`, mirrored in `ReferralRegistry.sol`):
- `pause()` — **GUARDIAN_ROLE only, one transaction**. It also **cancels any queued unpause** in the same tx, so a pending lift cannot fire after a fresh incident. Re-pausing while already paused is allowed, and is the supported way to invalidate a queued unpause.
- `queueUnpause()` — **GUARDIAN_ROLE only**; meaningful only while the contract is paused.
- `releaseUnpause()` — **permissionless**, but only succeeds once the **24 h `UNPAUSE_DELAY`** has elapsed. OpenZeppelin `_unpause()` reverts if the contract is not paused at release time, so a queued timer can never lift a running contract.
- A guardian can re-pause at any time; a re-pause cancels any newly queued lift.

Procedure:
1. On-call guardian confirms the incident with a second named engineer (two-person rule).
2. Execute `pause()` via the guardian path (2-of-3 multisig once live, otherwise hardware-wallet EOA per key management — § MAINNET-DEPLOYMENT-PACKAGE.md §4). Confirm the tx is **mined** on-chain, not merely submitted.
3. Because pause is one tx and cancels queued unpause, there is no timer window in which a stale unpause can lift it.
4. If no contract pause is available (pre-remediation state): immediate compensating actions — flip the frontend kill-switch to block all wallet writes and announce "temporary suspension" in the public channel. Slower and partial; this is why the M-4 remediation blocks go-live.
5. Record: timestamp of detection, timestamp of pause tx mined, tx hash, who signed. These timestamps are launch evidence (OBS-129 / §7).

## 3. Disclose

Within 24h of any S1/S2 (target same-day): post in the public channel — what happened, whether funds were at risk, current state (paused/operational), expected next update time. No speculation about root cause before engineering confirms it. CISO approves wording for anything involving actual loss; standard template otherwise.

## 4. Remediate

- The rebuilt fleet is **non-upgradeable** (`BoxTokenRegistry.sol:9`, `TokenPricer.sol:11` — "Non-upgradeable for build day"). There is **no implementation swap and no proxy admin**. A contract fix therefore cannot be hot-swapped; it requires a **redeploy to fresh addresses**, a frontend `currencies.ts` update in the same PR, and a fresh pause drill before go-live.
- Engineering reproduces the failure in a local fork of mainnet (anvil) and writes the fix with tests.
- Fix review: Senior Solidity Engineer + Smart Contract Auditors sign-off for any contract change; the redeploy itself requires the two-person rule and is disclosed publicly beforehand.
- Non-contract fixes (frontend, infra) follow standard code review.

## 5. Make whole

There is **no on-chain reserve** today and none is planned for the bounded-launch window: the fleet holds only in-flight deposit value, and no privileged role can move it (§8). Make-whole is therefore an **off-chain, board-gated** process:
1. **Who pays / from where:** phreaking.fun company treasury — never contract funds, and never by touching a user's on-chain assets.
2. **Board-approval step:** the CFO approves the affected-address/amount list and the total; the **CEO co-signs** any disbursement above `[THRESHOLD — set by CFO before go-live]` (two-person rule).
3. Engineering produces the affected-address/amount list from chain data; the record goes into a private incident ledger accessible to CISO + CEO only.
4. Users are notified individually where contact info exists; otherwise a public notice of the remediation program.
5. No user's on-chain assets are ever touched by the team as part of make-whole (pull-over-push).

## 6. On-call for first 30 days

**Blocking board input — the runbook is executable only once these are filled (routed to Approvals in parallel):**
- Primary guardian: `[NAMED GUARDIAN — assign before go-live]` — **BLOCKING**.
- Backup: `[NAMED BACKUP]` — **BLOCKING**.
- Paging: `[PAGING CHANNEL/TOOL]` — **BLOCKING**.

Procedure (concrete; runs once the names above are set):
- **Coverage:** 24/7 rotating shifts of **8 hours**; written handover notes required at every shift change.
- **Acknowledgement:** any page must be acknowledged **within 10 minutes**; if not acknowledged, the backup is paged automatically.
- **Authority:** the on-call guardian holds hardware-wallet access to the pause path. The guardian can `pause()` unilaterally in one tx; no further approval is needed to pause.
- **Two-person rule:** S1 pauses are confirmed with a second named engineer where time allows; if the second person is unreachable, the guardian pauses first and documents why.
- **Escalation ladder:** guardian → backup → Senior Solidity Engineer → CISO → CEO. Escalate to the CISO immediately for any actual or suspected fund loss; to the CEO for any make-whole decision.
- **Guardian device unavailable:** if the primary guardian cannot reach their device, the backup guardian pauses. If neither can, escalate to the Senior Solidity Engineer and CISO and execute the frontend kill-switch as a stopgap (§2 step 4 — slower and partial). Backup access is via the named backup hardware wallet; seed/recovery handling follows the key-management policy and is never shared over chat.
- **Weekly drill:** once per week for the full 30-day window — simulated S1 alert → executed `pause()` on Sepolia → documented timestamps (evidence feeds OBS-129 and the staged-cap review). The drill must cover that `pause()` cancels a queued unpause.

## 7. Exit from bounded launch

Caps lift only when G5 clears: an independent external audit with zero open critical/high findings, and remediations verified deployed. Then this runbook transitions to normal ops cadence (no dedicated 24/7 rotation), but pause-path drills remain quarterly.

## 8. Privileged surface (disclosed)

The rebuilt fleet is non-upgradeable and contains **no path by which any privileged role can move user funds**. The complete admin surface is listed in `MAINNET-DEPLOYMENT-PACKAGE.md` §3a; it consists of: the box executor pointer (`setExecutor`), the three cap setters (`setTotalValueAtRiskCap`, `setPerTransactionCap`, `setPerWalletCap` — `0` means **unlimited**, with no on-chain growth bound), the oracle price role (`KEEPER_ROLE`), guardian role management (`_setRoleAdmin(GUARDIAN_ROLE, DEFAULT_ADMIN_ROLE)`), and token/pool/referral configuration (`BoxTokenRegistry.registerToken` / `setPoolMembership` / `setActive`, `ReferralRegistry.setMaxRewardsPerReferrer`). A compromised admin can mis-configure or censor the fleet but cannot extract user funds.
