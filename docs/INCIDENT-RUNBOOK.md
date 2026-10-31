# phreaking.fun — Incident Runbook (Bounded-Launch Window)

Status: CISO **APPROVED WITH CONDITIONS** on [OBS-322](/OBS/issues/OBS-322) (conditions 1–3 tracked; not all closed — see below). This revision was **refreshed 2026-10-31** by Senior Solidity Engineer per OBS-338 to the rebuilt, non-upgradeable fleet and therefore **requires CISO re-approval** ([OBS-339](/OBS/issues/OBS-339)) because it changes text the CISO approved. **Not unconditionally approved — the CISO owns that language.** Originally prepared 2026-10-29 per OBS-129.
**CISO re-approval [OBS-428](/OBS/issues/OBS-428) — APPROVED WITH CONDITIONS, 2026-10-31.** Following the CTO decision [OBS-426](/OBS/issues/OBS-426) (Option 1: Safe-threshold pause, no contract change), §6 "Authority" was amended to the 2-of-3 Safe-threshold wording, emergency-stop co-signing staffing and the quorum-unreachable fallback were made explicit (§6), §2 step 2 and §6 were reconciled to describe the same pause path, and the weekly drill was upgraded to prove the two-signature 10-minute pause plus the 1-of-1 exception, kill-switch stopgap, and below-quorum unfreeze rejection (added to the OBS-129 evidence set). **Conditions:** the CISO condition-1 injection blockers below (admin set, paging, quorum, 24/7 on-call commitment — lines at "Still blocking") **remain open and remain BLOCKING**; the runbook is executable only once they land; the < 10-minute staffing requirement (2 of 3 guardians reachable) is a condition of this approval and must be evidenced by the weekly drill. No contract change is authorized by this document.
- CISO condition 1 (fill the §6 admin set + paging tool) is **pending the board's injection** into the guardian control. The board approved the control shape on card `85b0830d` at 2026-10-31T15:50:04Z and directed: *"go forward without the admin wallets for now. we will inject them later and update."* The surrounding procedure is concrete below but the placeholders cannot be filled until that injection lands (tracked on OBS-381).
- CISO condition 2 (a live, timed, human-executed Sepolia pause drill) is **not closed by this document**; it needs the broadcast path ([OBS-321](/OBS/issues/OBS-321)) and is tracked with the live drill, not the in-repo `FleetDrill` test.
- CISO condition 3 (make-whole funding statement) is addressed in §5.
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
2. Execute `pause()` via the guardian path (2-of-3 multisig once live — **two guardian signatures, one Safe transaction; a single guardian cannot pause alone while 2-of-3 is live**, see §6 emergency-stop staffing and quorum-unreachable fallback — otherwise hardware-wallet EOA per key management — § MAINNET-DEPLOYMENT-PACKAGE.md §4). Confirm the tx is **mined** on-chain, not merely submitted.
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

With mainnet value-at-risk at **$0** and deposits disabled, **no make-whole outlay is expected before G5**. There is **no on-chain reserve** today and none is planned for the bounded-launch window: the fleet holds only in-flight deposit value, and no privileged role can move it (§8). Make-whole is therefore an **off-chain, board-gated** process:
1. **Who pays / from where:** phreaking.fun company treasury — never contract funds, and never by touching a user's on-chain assets.
2. **Board-approval step:** any treasury disbursement requires **CFO approval plus CEO sign-off at incident time** (two-person rule). The CFO approves the affected-address/amount list and the total.
3. Engineering produces the affected-address/amount list from chain data; the record goes into a private incident ledger accessible to CISO + CEO only.
4. Users are notified individually where contact info exists; otherwise a public notice of the remediation program.
5. No user's on-chain assets are ever touched by the team as part of make-whole (pull-over-push).

## 6. On-call for first 30 days

**Board input status (updated 2026-10-31T15:50Z).** Board card `fb22247f` was **rejected** at 2026-10-31T15:13:13Z with no note; the board re-shaped the control in its own words and it was re-raised as card `85b0830d`, which the board **approved** at 2026-10-31T15:50:04Z (`decisionNote: null`) with this note on the approval's comment thread:

> *"go forward without the admin wallets for now. we will inject them later and update."*

**The approved control shape** (this replaces the old human-primary/backup roster shape):
- The **phreaking.fun admin dashboard governs every pause and freeze** — it is the control surface, not a status display.
- **Admins are a config-backed set of wallet addresses**, authenticated by connected-wallet signature. **No private key is held in the dashboard, in any service, or in any agent context** — custody stays human, in the guardian multisig.
- **Unfreeze requires an N-of-M admin-signature quorum** matching the on-chain guardian multisig (**2-of-3**, `MAINNET-DEPLOYMENT-PACKAGE.md` §3 "Emergency stop"), enforced **on-chain** — not in the frontend.
- The board's interim **single-admin exception** applies while only one admin is present, and switches off once a second admin is added.
- The dashboard **fails closed** below quorum and audit-logs every governance action.

**Still blocking (CISO condition 1) — the admin set and the paging tool are not yet named.** The board chose to ship the mechanism now and inject the operator later, so this runbook is **executable only once these land**:
- Primary admin (wallet address): `[NAMED ADMIN WALLET — board injection pending]` — **BLOCKING**.
- Second admin (if the admin set has more than one member): `[NAMED ADMIN WALLET 2 — board injection pending]` — **BLOCKING**.
- Paging: `[PAGING CHANNEL/TOOL]` — **BLOCKING**.
- Unfreeze quorum: `[N-OF-M UNFREEZE QUORUM — or "single-admin exception confirmed" — board injection pending]` — **BLOCKING**.
- 24/7 on-call commitment: `[ON-CALL COMMITMENT — acknowledge any page ≤ 10 min, one Sepolia pause drill per week — board injection pending]` — **BLOCKING**.

All four fields above are supplied by the board in one injection. A partial injection is not a staffed control.

**Injection-time preconditions** — the moment the admin set is populated, all of these must hold:
1. CISO access-control sign-off on the dashboard pause/freeze control is in place and its stated minimum is met (OBS-375).
2. The unfreeze quorum is enforced **on-chain** by the guardian multisig. A single-key unfreeze in the frontend fails the company key-handling policy and the control itself.
3. The paging tool escalates to a human, and the 24/7 on-call commitment (ack ≤ 10 minutes) is recorded.
4. The **live** Sepolia pause drill below has been executed and its evidence recorded (OBS-129).
5. This section and the dashboard admin config are updated with the injected values, and the stage-6 gate (OBS-294) is re-verified.
6. **The admin set can be injected without a code change, a dashboard rebuild, or a dashboard redeploy.** The board's instruction is to inject the wallets *later and update*; if the admin set is build-time configuration — for example a `NEXT_PUBLIC_*` value, which Next.js inlines into the client bundle at build time — then injection would require a release and the commitment would not be honoured. The set must be resolvable at **runtime** (on-chain `GUARDIAN_ROLE` membership, or a server-side runtime store), so that adding an admin is a data write, not a deploy. A server-side read of a Netlify *environment variable* does not satisfy this: Netlify bakes env vars into the deploy. Verified on OBS-374; the bar and the mechanical test are recorded on OBS-381.

Until then the emergency-pause control is **built but not staffed**, and the mainnet bounded launch is not authorised. Sepolia is unaffected.

Procedure (concrete; runs once the names above are set):
- **Coverage:** 24/7 rotating shifts of **8 hours**; written handover notes required at every shift change.
- **Acknowledgement:** any page must be acknowledged **within 10 minutes**; if not acknowledged, the backup is paged automatically.
- **Emergency-stop staffing (threshold-gated pause):** while the Safe is 2-of-3, a pause is one Safe transaction needing **two guardian signatures**, and the < 10-minute target ([OBS-426](/OBS/issues/OBS-426) §3; `MAINNET-DEPLOYMENT-PACKAGE.md` §109 "< 10 minutes from alert to paused state") therefore requires **at least 2 of the 3 guardians reachable within 10 minutes at all times**, with overlapping shift handoffs — there must be no single-reachable-guardian window while 2-of-3 is live. Under the 1-of-1 single-admin exception the requirement is the sole guardian reachable within 10 minutes, single-signature.
- **Quorum-unreachable fallback (explicit):** if a second guardian signature is not reachable inside the 10-minute window, a single guardian **cannot** pause the contracts. On-call must then, in parallel: (1) page the remaining guardians via the paging tool and escalate the ladder below; (2) execute the **§2 step 4 frontend kill-switch stopgap immediately** — flip wallet writes off and post the public suspension notice — so the user-facing exposure is stopped even though the contracts keep running; and (3) complete the 2-of-3 Safe pause as soon as the second signature is available. The kill-switch stopgap is partial (contract state is not paused) and must be replaced by the real pause as soon as quorum is reachable; the incident record must note the stopgap window and the reason quorum was unreachable.
- **Authority (CTO decision [OBS-426](/OBS/issues/OBS-426), Option 1):** the guardian key stays in the human-held guardian multisig and is never in the dashboard. **Pause is a 2-of-3 guardian multisig action — one Safe transaction co-signed by two guardians — while two or more admins exist.** Under the board's single-admin exception the Safe is configured 1-of-1 and a single guardian may pause. **Unfreeze requires the N-of-M admin-signature quorum**, enforced on-chain by the multisig, with the single-admin exception while only one admin is present. There is **no unilateral (single-signer) pause signer in the launch configuration**; this line and §2 step 2 describe the same path.
- **Two-person rule:** while the Safe is 2-of-3, the threshold **is** the two-person rule — every executed pause carries two guardian signatures by construction, so no separate confirmation step is needed to pause. Under the 1-of-1 single-admin exception, S1 pauses are confirmed with a second named engineer where time allows; if that person is unreachable, the sole guardian pauses first and documents why.
- **Escalation ladder:** admin/guardian → backup admin → Senior Solidity Engineer → CISO → CEO. Escalate to the CISO immediately for any actual or suspected fund loss; to the CEO for any make-whole decision.
- **Admin device unavailable:** if the primary admin cannot reach their device, the backup admin pauses (when the admin set has a second member). If neither can, escalate to the Senior Solidity Engineer and CISO and execute the frontend kill-switch as a stopgap (§2 step 4 — slower and partial). Admin access is via the named admin's hardware wallet; seed/recovery handling follows the key-management policy and is never shared over chat.
- **Weekly drill:** once per week for the full 30-day window — simulated S1 alert → executed `pause()` on Sepolia **via the decided guardian path as written (§2 step 2 / §6 Authority)** → documented timestamps (evidence feeds OBS-129 and the staged-cap review). While the Safe is 2-of-3, the drill must be a **live, timed, two-signature Safe pause that completes end-to-end inside the 10-minute target**, and it must also cover: (a) `pause()` cancels a queued unpause; (b) behaviour under the 1-of-1 single-admin exception — a single-guardian pause completes ≤ 10 min and the drill log flags it as exception-mode; (c) a quorum-unreachable dry run — the frontend kill-switch stopgap (§2 step 4) is executed and the escalation ladder is paged, with the stopgap documented as stopgap, not pause; (d) a below-quorum unfreeze attempt on Sepolia is rejected on-chain by the multisig. **The CISO quorum drill items (b)–(d) are part of the [OBS-129](/OBS/issues/OBS-129) launch evidence set from this re-approval on.**

## 7. Exit from bounded launch

Caps lift only when G5 clears: an independent external audit with zero open critical/high findings, and remediations verified deployed. Then this runbook transitions to normal ops cadence (no dedicated 24/7 rotation), but pause-path drills remain quarterly.

## 8. Privileged surface (disclosed)

The rebuilt fleet is non-upgradeable and contains **no path by which any privileged role can move user funds**. The complete admin surface is listed in `MAINNET-DEPLOYMENT-PACKAGE.md` §3a; it consists of: the box executor pointer (`setExecutor`), the three cap setters (`setTotalValueAtRiskCap`, `setPerTransactionCap`, `setPerWalletCap` — `0` means **unlimited**, with no on-chain growth bound), the oracle price role (`KEEPER_ROLE`), guardian role management (`_setRoleAdmin(GUARDIAN_ROLE, DEFAULT_ADMIN_ROLE)`), and token/pool/referral configuration (`BoxTokenRegistry.registerToken` / `setPoolMembership` / `setActive`, `ReferralRegistry.setMaxRewardsPerReferrer`). A compromised admin can mis-configure or censor the fleet but cannot extract user funds.
