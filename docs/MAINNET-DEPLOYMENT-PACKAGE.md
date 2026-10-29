# phreaking.fun — Mainnet Deployment Package (Bounded Launch)

Status: DRAFT for board/CFO/CEO sign-off. Prepared by Senior Solidity Engineer, 2026-10-29, per OBS-129.
Companion document: `INCIDENT-RUNBOOK.md` (CISO review required).

**Board decision 2026-10-29:** all contracts will be rebuilt from scratch (see §8) with bounded-launch
controls baked in; no external audit funding pre-investment, so caps and the pause requirement remain.

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

**All four Sepolia contracts below are to be REBUILT and redeployed at new addresses per the 2026-10-29 board decision (§8); these rows document the current test deployments for reference.**

| Role | Sepolia (current, being replaced) | Mainnet (target, fill at deploy) |
|---|---|---|
| MysteryBox (box purchase; proxy, owner @ slot 0) | `0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5` | `[PENDING DEPLOY]` |
| WhiteBox V2 (donations) | `0x0d25a6C86EAbbcd2FC6F766aeFE79929903095D2` | `[PENDING DEPLOY]` |
| BlueBox | `0x5555A156c36DE4734175C5613304B04eD3ffe6Cb` | `[PENDING DEPLOY]` |
| SilverBox | `0x5C973451Bf8De44c84171DAc3447e4b1e16144Fc` | `[PENDING DEPLOY]` |
| USDC.e / USDT | `0xa7A41e0B76147c8162c435f69d4b78886C0eF907` | Mainnet canonical: USDC `0xA0b86991c6218b36c1D19D4a2e9Eb0cE3606eB48`, USDT `0xdAC17F958D2ee523a2206B0C59bC7AbE5U878347` |
| LINK | `0x779877A7B0D9E8603169DdbD7836e478b4624789` | Mainnet canonical: `0x4fEdC5c2B5a58E0FAd45d097CBFC0E5c4Fa9a5A1` |
| WETH (wrapped) | `0x3FbDc62324e3957544f1Ab60C19CeB81F0870d46` | Mainnet canonical: `0xC02aaA39b223FE7D6aACe318E0cEa7812a055dCd` |
| Mystery box token (ERC-20) | `[see constants/currencies.ts mysteryBoxToken]` | `[PENDING DEPLOY]` |

Frontend gate: `HomeClient.tsx` hard-blocks all wallet writes when `chainId !== 11155111` ("Mainnet está
desativado"). **This gate must remain until G5.** Lifting it is an explicit board action, not a code change.

### Live storage inspection — Sepolia, block ~48,307,962 (2026-10-29)

Verified on-chain via public RPC (`ethereum-sepolia-rpc.publicnode.com`):

| Contract | Storage slot 0 | Interpretation |
|---|---|---|
| MysteryBox `0x30bbe...Adf5` | `0x31346eaaef18e0723d0a6d07f0a89d3697b0784a` | Custom proxy (not EIP-1967); owner stored at slot 0 → single-EOA `setBoxImplementation`/`updateBoxImplementation` power today |
| BlueBox `0x5555...e6Cb` | `0xc1b2ec23fb076f10fc84e3aa85b15835649b8f46` | Ownable-style owner at slot 0 |
| SilverBox `0x5C97...44Fc` | `0xc1b2ec23fb076f10fc84e3aa85b15835649b8f46` | Same owner as BlueBox — shared EOA controls both box contracts |
| WhiteBox V2 `0x0d25...95D2` | `1` (not an address) | Non-standard layout; owner/roles not at slot 0 (AccessControl-style or custom) |

Findings: **two distinct privileged EOAs** currently govern the four contracts (`0x31346e...784a` for
MysteryBox, `0xc1b2ec...8f46` for both box variants); no multisig. Neither contract exposes any pause
function (ABI-confirmed). Both facts are superseded by the rebuild (§8), which moves all privileged
power to a 2-of-3 multisig with pause-only admin capability at launch.

## 3. Bounded-launch controls (required)

| Control | Mechanism | Owner | Status |
|---|---|---|---|
| Total value-at-risk cap | Hard ceiling on funds held across all contracts; CFO sets amount, CEO signs off in writing below | CFO + CEO | `[AMOUNT PENDING CFO]` — `[CEO SIGN-OFF PENDING]` |
| Per-transaction cap | Max USDC/USDT per single purchase or donation tx (frontend-enforced until contract-level caps ship) | Eng | Value: `[PENDING CFO]` |
| Per-wallet cap | Max cumulative value per wallet address (tracked off-chain for launch window; contract support required long-term) | Eng + CISO | Value: `[PENDING CFO]` |
| Emergency stop, reachable in minutes | All rebuilt contracts (§8) ship with guardian `pause()/unpause()`, OBS-128 M-4; guardian = 2-of-3 multisig. Pause must be drilled end-to-end on Sepolia before launch (step 5). | Senior Solidity Engineer | **MET BY REBUILD — pending deployment + drill** |
| No silent privileged fund movement | Current Sepolia contracts expose owner `emergencyWithdraw(token,amount)` / `emergencyWithdrawETH()` (WhiteBox V2) and `setBoxImplementation`/`updateBoxImplementation` (MysteryBox). Superseded by the rebuild (§8): no contract in scope will contain any admin path that moves user funds; implementation changes use a UUPS proxy with guardian control held by multisig, disclosed. Admin capability for launch: pause-only. | Senior Solidity Engineer + Chief Auditor review | **MET BY REBUILD — pending deployment** |
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

1. Rebuilt contracts (§8) deployed to fresh Sepolia addresses with guardian `pause()`; pause drill passed (step 5 below records timestamps).
2. No privileged fund-movement path remains in any contract — by construction of the rebuild, admin capability is pause-only at launch.
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

## 8. Contract rebuild plan (board decision 2026-10-29)

The board has decided that **all contracts will be rebuilt from scratch** rather than patched in place,
because the deployed sources are unavailable and the current deployments carry structural gaps
(no pause, owner-only privileged fund movement, single-EOA control — see §2 live inspection). This is
the remediation vehicle for OBS-128 findings H-1/H-2/H-3/M-1–M-4.

**In scope (rebuild + redeploy on Sepolia at fresh addresses):**

| Contract | Replaces | Key requirements |
|---|---|---|
| MysteryBox V3 (+ UUPS proxy) | `0x30bbe...Adf5` | All OBS-128 box findings fixed; guardian `pause()/unpause()` (M-4); no owner fund-movement path; implementation upgrade via UAPS/UUPS with multisig-held guard role, publicly disclosed; per-tx + per-wallet caps enforced in-contract once CFO values are set (§3) |
| WhiteBox V2 → V3 | `0x0d25a6...95D2` | Remove `emergencyWithdraw*`; donations flow to configured wallets only via normal redemption path; guardian pause; donation cap enforcement |
| BlueBox V2 | `0x5555A1...e6Cb` | Same hardening as MysteryBox V3 (shared box logic) |
| SilverBox V2 | `0xc1b2ec...8f46`-owned instance | Same hardening; shares owner/guardian multisig with BlueBox by design, disclosed |

**Non-negotiables for every contract:** Foundry project in this repo (`contracts/`, pinned
solc + OZ versions), full test suite (invariant tests where feasible), no admin path that can move user
funds, all privileged roles held by the 2-of-3 multisig from §4, NatSpec with trust assumptions.

**Process gates:** Chief Auditor reviews the rebuilt code before any deployment; deployments go to fresh
Sepolia addresses first, frontend `currencies.ts` updated in the same PR, pause drill executed (§6 step 5),
then mainnet target per board schedule.

**Dependencies:** CFO cap amounts (contract-level enforcement needs values); multisig setup (§4) must
exist before deployment so guard roles can be assigned to it; CEO sign-off on this rebuild scope is
requested as part of §3 approval.
