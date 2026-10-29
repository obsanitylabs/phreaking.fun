# phreaking.fun — Incident Runbook (Bounded-Launch Window)

Status: DRAFT, pending CISO review/approval. Prepared 2026-10-29 by Senior Solidity Engineer per OBS-129.
Applies to the first 30 days of mainnet operation under bounded-launch caps (§ MAINNET-DEPLOYMENT-PACKAGE.md).

Severity: S1 = user funds at risk / cap breach / privileged function exploited. S2 = contract paused unexpectedly, integration failure with fund impact potential. S3 = degraded functionality, no fund risk.

## 1. Detection

Sources (all feed the on-call channel):
- On-chain alerts: pause-state change, `emergencyWithdraw*` calls, implementation/owner changes, contract balance > 80% of cap, revert spikes in purchase/donate flows (see deployment package §5).
- Frontend error reporting + user reports (socials, support inbox) — any "I paid and got nothing" report is S1 until proven otherwise.
- Manual sweep: on-call checks contract balances vs caps once per shift.

## 2. Pause (target: < 10 minutes from detection to paused state for S1)

1. On-call guardian confirms incident with a second named engineer (two-person rule).
2. Execute `pause()` via the guardian path (multisig if deployed; otherwise hardware-wallet EOA per key-management policy). Confirm tx mined on-chain, not just submitted.
3. If no contract pause is available (pre-remediation state), immediate compensating actions: flip frontend kill-switch to block all wallet writes + announce "temporary suspension" in the public channel. This is slower and partial — it is why M-4 remediation blocks go-live.
4. Record: timestamp of detection, timestamp of pause tx mined, tx hash, who signed. These timestamps are launch evidence.

## 3. Disclose

Within 24h of any S1/S2 (target same-day): post in the public channel — what happened, whether funds were at risk, current state (paused/operational), expected next update time. No speculation about root cause before engineering confirms it. CISO approves wording for anything involving actual loss; standard template otherwise.

## 4. Remediate

- Engineering reproduces the failure in a local fork of mainnet (anvil) and writes the fix with tests.
- Fix goes through normal review: Senior Solidity Engineer + Smart Contract Auditors sign-off for any contract change. If contracts are upgradeable, the implementation swap itself requires the two-person rule and is disclosed publicly beforehand.
- Non-contract fixes (frontend, infra) follow standard code review.

## 5. Make whole

- Any user loss identified: CFO approves make-whole payment from company treasury (not contract funds), recorded with wallet addresses and amounts in a private incident ledger accessible to CISO + CEO only.
- Users are notified individually when contact info is available; otherwise public notice of remediation program.
- No user's on-chain assets should ever be touched by the team as part of make-whole (pull-over-push principle).

## 6. On-call for first 30 days

- Primary: `[NAMED GUARDIAN — assign before go-live]` with hardware-wallet access to the pause path.
- Backup: `[NAMED BACKUP]`, reachable within minutes, holds multisig share if deployed.
- Coverage: 24/7 rotating shifts (8h), page via `[PAGING CHANNEL/TOOL]`; handover notes required at shift change; on-call must acknowledge any page within 10 minutes or backup is paged automatically.
- Weekly: one drill — simulated S1 alert → executed pause on Sepolia → documented timestamps, for the full 30-day window (evidence feeds OBS-129 and staged-cap review).

## 7. Exit from bounded launch

Caps lift only when G5 clears: independent external audit with zero open critical/high findings, remediations verified deployed. Then this runbook transitions to normal ops cadence (no dedicated 24/7 rotation), but pause-path drills remain quarterly.
