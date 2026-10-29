# phreaking.fun — Mainnet Deployment Package (Bounded Launch)

Status: DRAFT for board/CFO/CEO sign-off. Prepared by Senior Solidity Engineer, 2026-10-29, per OBS-129.
Companion document: `INCIDENT-RUNBOOK.md` (CISO review required).

## 1. Why bounded launch

External audit is not funded until post-investment (gate G5 in the traction plan). Until an external
audit clears, mainnet operations run under **bounded-launch controls**: hard value caps, a tested
emergency stop path, no silent privileged fund movement, staged cap increases tied to clean operating
windows and G5.

**Caps stay in effect until an independent external audit (G5) reports zero open critical/high findings.**
No cap increase is authorized before that gate passes.

## 2. Contract address inventory

Source of truth: `src/constants/currencies.ts` (frontend). Live Sepolia deployments verified against the
repository ABI files (`src/abi/mysteryBoxABI.ts`, `src/abi/whiteBoxABI.ts`). Mainnet addresses must be
filled in by the deployer at deployment time — nothing is pre-deployed on mainnet today.

| Role | Sepolia (test) | Mainnet (target, fill at deploy) |
|---|---|---|
| MysteryBox (box purchase) | `0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5` | `[PENDING DEPLOY]` |
| WhiteBox V2 (donations) | `0x0d25a6C86EAbbcd2FC6F766aeFE79929903095D2` | `[PENDING DEPLOY]` |
| USDC.e / USDT | `0xa7A41e0B76147c8162c435f69d4b78886C0eF907` | Mainnet canonical: USDC `0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48`, USDT `0xdAC17F958D2ee523a2206B0C59bC7AbE5U878347` |
| LINK | `0x779877A7B0D9E8603169DdbD7836e478b4624789` | Mainnet canonical: `0x4fEdC5c2B5a58E0FAd45d097CBFC0E5c4Fa9a5A1` |
| WETH (wrapped) | `0x3FbDc62324e3957544f1Ab60C19CeB81F0870d46` | Mainnet canonical: `0xC02aaA39b223FE7D6aACe318E0cEa7812a055dCd` |
| Mystery box token (ERC-20) | `[see constants/currencies.ts mysteryBoxToken]` | `[PENDING DEPLOY]` |

Frontend gate: `HomeClient.tsx` hard-blocks all wallet writes when `chainId !== 11155111` ("Mainnet está
desativado"). **This gate must remain until G5.** Lifting it is an explicit board action, not a code change.

## 3. Bounded-launch controls (required)

| Control | Mechanism | Owner | Status |
|---|---|---|---|
| Total value-at-risk cap | Hard ceiling on funds held across all contracts; CFO sets amount, CEO signs off in writing below | CFO + CEO | `[AMOUNT PENDING CFO]` — `[CEO SIGN-OFF PENDING]` |
| Per-transaction cap | Max USDC/USDT per single purchase or donation tx (frontend-enforced until contract-level caps ship) | Eng | Value: `[PENDING CFO]` |
| Per-wallet cap | Max cumulative value per wallet address (tracked off-chain for launch window; contract support required long-term) | Eng + CISO | Value: `[PENDING CFO]` |
| Emergency stop, reachable in minutes | **GAP:** neither deployed Sepolia contract exposes a pause function today. Required before mainnet go-live: deploy contracts with guardian `pause()/unpause()` (see OBS-128 M-4) OR adopt compensating control (address-based blocklist + immediate frontend kill-switch). Pause must be testable on Sepolia end-to-end before launch. | Senior Solidity Engineer | **NOT MET — blocks go-live** |
| No silent privileged fund movement | WhiteBox V2 exposes `emergencyWithdraw(token,amount)` / `emergencyWithdrawETH()` (owner-only) and MysteryBox exposes `setBoxImplementation`/`updateBoxImplementation`. These must be disclosed publicly and either time-locked or removed before mainnet. Admin capability for launch: pause-only. | Senior Solidity Engineer + Chief Auditor review | **NOT MET — blocks go-live** |
| Staged cap increases | Each increase requires: (a) ≥7 consecutive days clean operating window, (b) CISO sign-off on incident log = zero severity-1/2 events, (c) CEO approval in writing. Cap increases are incremental (≤50% of current), never to the full unlimited state before G5. | CFO proposes / CEO approves | Procedure defined here; amounts pending |
| Public disclosure language | "The phreaking.fun smart contracts have been internally reviewed by the development team but not yet audited by an independent firm. Total user value is capped at $[CAP] per board policy, and caps will remain until an external audit is complete." — must appear on site before first mainnet tx. | CISO + Legal (if any) | Language drafted; publish before go-live |

## 4. Key management

- Owner/guardian keys: EOA-held minimum-viable for launch window, **2-of-3 multisig recommended** for
  anything that can move funds or change implementations (e.g., Gnosis Safe). If multisig is not in place
  before go-live, the emergencyWithdraw/implementation-swap functions above must be disabled by redeploy.
- Key storage: hardware wallet (Ledger/Trezor) offline; never in env files, repos, CI secrets of non-deploy jobs, or agent contexts. Rotation: on any personnel change immediately.
- On-call guardian for first 30 days: named individual + backup (see `INCIDENT-RUNBOOK.md` §5). Must have
  hardware wallet access and be reachable within minutes.

## 5. RPC / monitoring checklist

- Primary RPC: dedicated paid node (e.g., dedicated Sepolia/mainnet endpoint) — not public free tier for mainnet; latency SLA < 30s block finality visibility.
- Secondary RPC: independent provider for failover + cross-check.
- Monitoring alerts (all to on-call channel, paged): contract pause state change (event), owner/role change events, `emergencyWithdraw*` calls, implementation-address changes (`setBoxImplementation`, `updateBoxImplementation`), USDC/USDT balance of contracts exceeding `[CAP] * 0.8` threshold, any reverts spike in `purchaseBox`/`donateToOrg`.
- Dashboards: contract balances vs cap, tx failure rate, gas spend per day.
- Log retention ≥ 90 days; access restricted to CISO + engineering leads.

## 6. Launch sequence (gated)

1. OBS-128 M-4 remediation landed in deployed contracts (pause exists and is tested on Sepolia).
2. Privileged paths disclosed or time-locked/remediated (§3 row "No silent privileged fund movement").
3. CFO sets cap amounts; CEO signs §3.
4. CISO approves `INCIDENT-RUNBOOK.md`.
5. End-to-end pause drill executed live on Sepolia with named guardian, timed < 10 minutes from alert to paused state — record timestamp as evidence in OBS-129.
6. Frontend gate lifted only by explicit board action at G5 or later; public disclosure text published (§3).

## 7. Evidence to attach to OBS-129 on completion

- Sepolia pause-drill timestamps (alert → paused) and tx hashes.
- Signed cap amounts + CEO approval record.
- CISO approval of runbook.
- Multisig or key-management attestation.
- Statement: caps remain until external audit (G5) clears with zero open critical/high findings.
