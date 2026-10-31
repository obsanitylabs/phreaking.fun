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
| MysteryBox (box purchase; legacy deployment, owner @ slot 0) | `0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5` | `[PENDING DEPLOY]` |
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
| MysteryBox `0x30bbe...Adf5` | `0x31346eaaef18e0723d0a6d07f0a89d3697b0784a` | Legacy custom storage layout (owner at slot 0). Superseded by the **non-upgradeable** rebuild (§8) — see §3a for the real admin surface |
| BlueBox `0x5555...e6Cb` | `0xc1b2ec23fb076f10fc84e3aa85b15835649b8f46` | Ownable-style owner at slot 0 |
| SilverBox `0x5C97...44Fc` | `0xc1b2ec23fb076f10fc84e3aa85b15835649b8f46` | Same owner as BlueBox — shared EOA controls both box contracts |
| WhiteBox V2 `0x0d25...95D2` | `1` (not an address) | Non-standard layout; owner/roles not at slot 0 (AccessControl-style or custom) |

Findings: **two distinct privileged EOAs** currently govern the four contracts (`0x31346e...784a` for
MysteryBox, `0xc1b2ec...8f46` for both box variants); no multisig. Neither contract exposes any pause
function (ABI-confirmed). Both facts are superseded by the rebuild (§8), which moves all privileged
power to a 2-of-3 multisig. The rebuilt fleet is **non-upgradeable**; the complete admin surface is
disclosed in §3a, and no role in it can move user funds.

## 3. Bounded-launch controls (required)

| Control | Mechanism | Owner | Status |
|---|---|---|---|
| Total value-at-risk cap | Hard ceiling on funds held across all contracts; CFO sets amount, CEO signs off in writing below | CFO + CEO | `[AMOUNT PENDING CFO]` — `[CEO SIGN-OFF PENDING]` |
| Per-transaction cap | Max USD value per single purchase or donation tx, enforced **in-contract** (`MysteryBoxBase.setPerTransactionCap`); `0` = disabled. | Eng | Value: `[PENDING CFO]` |
| Per-wallet cap | Max cumulative USD value per wallet address, enforced **in-contract** (`MysteryBoxBase.setPerWalletCap`); `0` = disabled. | Eng + CISO | Value: `[PENDING CFO]` |
| Emergency stop, reachable in minutes | All rebuilt contracts (§8) ship with guardian `pause()`/timelocked unpause, OBS-128 M-4; guardian = 2-of-3 multisig. Pause must be drilled end-to-end on Sepolia before launch (step 5). | Senior Solidity Engineer | **MET BY REBUILD — pending deployment + drill** |
| No silent privileged fund movement | **Confirmed by construction of the rebuild (§8): no privileged role can sweep or move user funds.** The rebuilt fleet is **non-upgradeable** — no implementation swap and no proxy admin. The fleet contains no admin fund-withdrawal function, no `sweep`/`rescue`/`recover`, no `receive()`/`fallback()`, and no outbound `safeTransfer` (only inbound `safeTransferFrom` on deposit). Admin capability is limited to the configuration surface disclosed in §3a. | Senior Solidity Engineer + Chief Auditor review | **MET BY REBUILD — pending deployment** |
| Staged cap increases | Each increase requires: (a) ≥7 consecutive days clean operating window, (b) CISO sign-off on incident log = zero severity-1/2 events, (c) CEO approval in writing. Cap increases are incremental (≤50% of current), never to the full unlimited state before G5. | CFO proposes / CEO approves | Procedure defined here; amounts pending |
| Public disclosure language | "The phreaking.fun smart contracts have been internally reviewed by the development team but not yet audited by an independent firm. Total user value is capped at $[CAP] per board policy, and caps will remain until an external audit is complete." — must appear on site before first mainnet tx. | CISO + Legal (if any) | Language drafted; publish before go-live |

### 3a. Real privileged surface (disclosed)

The rebuilt fleet is **non-upgradeable** (`BoxTokenRegistry.sol:9`, `TokenPricer.sol:11`) and contains **no path by which any privileged role can move user funds**. The complete admin surface, which the CISO must weigh, is:

| Surface | What admin can do | Risk posture |
|---|---|---|
| `setExecutor` (`MysteryBoxBase`) | Point the **next** deposit at an admin-chosen executor | Accepted risk, logged at `SEPOLIA-ATTACK-SIM.md:198`; caps bound exposure; rotation is one tx per box |
| `setTotalValueAtRiskCap` / `setPerTransactionCap` / `setPerWalletCap` | Raise caps; **`0` means unlimited**, with **no on-chain growth bound** (`MysteryBoxBase.sol:124`) | Governed by the staged-cap-increase row above; staged increases are a governance procedure, not enforced on-chain |
| Oracle price role (`KEEPER_ROLE` on both `RolePriceSource` feeds behind the two-source `TokenPricer`) | Publish quotes | A low quote can shrink the counted value-at-risk **inside the 1 % band** (accepted risk, `SEPOLIA-ATTACK-SIM.md:201`); the pricer publishes the **higher** of two agreeing sources, so one suppressed source cannot shrink VaR; any stale/missing/diverging source fails closed |
| Guardian role management (`_setRoleAdmin(GUARDIAN_ROLE, DEFAULT_ADMIN_ROLE)`) | Grant/revoke the guardian | Admin controls who can pause; a malicious admin could leave the fleet un-pausable |
| `BoxTokenRegistry.registerToken` / `setPoolMembership` / `setActive` | Add/remove/disable tokens and pools | Configuration only; cannot move funds |
| `ReferralRegistry.setMaxRewardsPerReferrer` | Set the per-referrer reward cap (`0` = unlimited) | Bounds program exposure; `ReferralToken.maxSupply` hard-caps it |
| `MINTER_ROLE` grants (referral token) | Mint/burn referral rewards | Referral program only; `maxSupply` bounds exposure |

**Plain statement:** no privileged role can sweep or move user funds. The fleet contains no admin fund-withdrawal function, no `sweep`/`rescue`/`recover`, no `receive()`/`fallback()`, and no outbound `safeTransfer` (only inbound `safeTransferFrom` on deposit), and the contracts are **non-upgradeable** (no implementation swap, no proxy admin). A compromised admin can mis-configure or censor the fleet but **cannot extract user funds**.

## 4. Key management

- Owner/guardian keys: a single **2-of-3 Gnosis Safe** holds the guardian pause role and is the **sole
  `DEFAULT_ADMIN_ROLE` holder** across the fleet (both price sources, the pricer, the registry, every box,
  and the referral contracts). Per the CTO decision [OBS-426](/OBS/issues/OBS-426) Option 1, a pause is
  **one Safe transaction co-signed by two of the three guardians — no contract change**; the runbook §6
  "Authority" records the same path. Admin/pricing authority is therefore the multisig alone: KEEPER_ROLE
  grants/revokes can only come from it once the deployer EOA has renounced (below). The rebuilt fleet has no
  fund-movement or implementation-swap surface, so key compromise is bounded to pause / censor /
  mis-configuration (§3a) — it cannot drain funds.
- **Deployer renouncement (N-2) end state:** `script/Deploy.s.sol` revokes the deployer EOA's temporary
  `KEEPER_ROLE` on **both** price sources and renounces its `DEFAULT_ADMIN_ROLE` on **both sources and the
  pricer** (and on every other contract, to the multisig) after handoff to the named keepers and the
  multisig. The script **asserts the renouncements on-chain after the broadcast** (`require(...)` checks on
  `hasRole`/`renounceRole` outcomes) so a partial handoff cannot broadcast silently — see
  `contracts/README.md` findings row **N-2**. After the broadcast the deployer EOA holds no pricing or admin
  authority; the multisig is the only admin and the only pricing authority.
- Key storage: hardware wallet (Ledger/Trezor) offline; never in env files, repos, CI secrets of non-deploy jobs, or agent contexts. Rotation: on any personnel change immediately.
- On-call guardian for first 30 days: named individual + backup (see `INCIDENT-RUNBOOK.md` §6). Must have
  hardware wallet access and be reachable within minutes.

## 5. RPC / monitoring checklist

- Primary RPC: dedicated paid node (e.g., dedicated Sepolia/mainnet endpoint) — not public free tier for mainnet; latency SLA < 30s block finality visibility.
- Secondary RPC: independent provider for failover + cross-check.
- Monitoring alerts (all to on-call channel, paged): pause-state change (`Paused`/`Unpaused`), role changes (`RoleGranted`/`RoleRevoked` for admin/guardian/keeper/minter), admin config events (`ExecutorChanged`, `TotalValueAtRiskCapChanged`, `PerTransactionCapChanged`, `PerWalletCapChanged`, `MaxRewardsPerReferrerChanged`, `TokenRegistered`, `PoolMembershipChanged`, `TokenActivated`), `TokenPricer.isFresh` false, contract token balance or `totalValueAtRisk` exceeding `[CAP] * 0.8`, and any revert spike in `deposit` / `purchaseBox` / `donateToOrg`.
- Dashboards: contract balances vs cap, tx failure rate, gas spend per day.
- Log retention ≥ 90 days; access restricted to CISO + engineering leads.

## 6. Launch sequence (gated)

1. Rebuilt contracts (§8) deployed to fresh Sepolia addresses with guardian `pause()`; pause drill passed (step 5 below records timestamps).
2. No privileged fund-movement path remains in any contract — by construction of the rebuild, admin capability is limited to the disclosed configuration surface (§3a), none of which moves user funds.
3. CFO sets cap amounts; CEO signs §3.
4. CISO approves `INCIDENT-RUNBOOK.md` — **approved with conditions** on OBS-322 and **re-approved with conditions** on [OBS-428](/OBS/issues/OBS-428) for the amended (2-of-3 Safe-threshold) revision that ships here; the §6 condition-1 injection blockers remain open and remain blocking (see runbook §6).
5. End-to-end pause drill executed live on Sepolia **via the 2-of-3 guardian Safe (one Safe tx, two guardian signatures per [OBS-426](/OBS/issues/OBS-426) Option 1)**, timed < 10 minutes from alert to paused state — record timestamp + tx hash as evidence in OBS-129. The CISO quorum-drill items (single-admin exception, quorum-unreachable kill-switch stopgap, below-quorum unfreeze rejection) are part of the runbook §6 weekly drill and its OBS-129 evidence set.
6. Frontend gate lifted only by explicit board action at G5 or later; public disclosure text published (§3).

### 6a. Mainnet pre-broadcast gates (hard stop)

These gates must be satisfied **before any mainnet broadcast**. They are additional to the Sepolia launch
sequence above; the mainnet launch gate is currently **CLOSED** (frontend Sepolia-only, mainnet user funds
NO-GO) and nothing here authorises a mainnet broadcast.

| Gate | Requirement | Owner | Source of truth |
|---|---|---|---|
| Per-contract fuzz re-run (CTO mainnet gate) | Before any mainnet broadcast, **re-run the fuzz/invariant harness one-model-context-per-contract** (the OBS-248 coverage caveat is made conditional on this; the reproducible per-contract re-run with `--fuzz-seed` is the accepted-evidence path). | Eng | CTO disposition [OBS-345](/OBS/issues/OBS-345); caveat row in `contracts/README.md` ("Coverage caveat") |
| F-3 operator row — pricer/registry decimals coupling | For every pooled token, assert on-chain `pricer.priceOf(token)` decimals == `registry.decimalsOf(token)` **before opening the pool** (mismatch makes every deposit revert fail-closed). Wording is not duplicated here — see the operator checklist row. | Operator (stage 7) | `contracts/README.md` § "F-3 operator checklist row (handed to stage 7)" |
| Deployer renouncements asserted (N-2) | `script/Deploy.s.sol` must complete with the deployer EOA holding **no** `KEEPER_ROLE` on either source and **no** `DEFAULT_ADMIN_ROLE` on sources or pricer, asserted on-chain post-broadcast; the multisig is the sole admin/pricing authority (§4). | Senior Solidity Engineer | `contracts/README.md` findings row **N-2**; `script/Deploy.s.sol` post-broadcast asserts |

## 7. Evidence to attach to OBS-129 on completion

- Sepolia pause-drill timestamps (alert → paused) and tx hashes.
- Signed cap amounts + CEO approval record.
- CISO approval of runbook.
- Multisig or key-management attestation.
- Statement: caps remain until external audit (G5) clears with zero open critical/high findings.

## 8. Contract rebuild (board decision 2026-10-29)

The board decided that **all contracts would be rebuilt from scratch** rather than patched in place,
because the deployed sources were unavailable and the current deployments carried structural gaps
(no pause, owner-only privileged fund movement, single-EOA control — see §2 live inspection). This is
the remediation vehicle for OBS-128 findings H-1/H-2/H-3/M-1–M-4. The rebuilt fleet is **non-upgradeable
by design** — a deliberate choice so there is no implementation-swap surface for an attacker to abuse.

**In scope (rebuild + redeploy on Sepolia at fresh addresses):**

| Contract | Replaces | Key requirements |
|---|---|---|
| MysteryBox V3 (non-upgradeable) | `0x30bbe...Adf5` | All OBS-128 box findings fixed; guardian `pause()` in one tx with timelocked unpause (M-4); no owner fund-movement path; **non-upgradeable — no proxy admin, no implementation swap**; total + per-tx + per-wallet caps enforced in-contract once CFO values are set (§3) |
| WhiteBox V2 → V3 | `0x0d25a6...95D2` | No admin fund-withdrawal path; donations flow to configured wallets only via the normal redemption path; guardian pause; donation cap enforcement |
| BlueBox V2 | `0x5555A1...e6Cb` | Same hardening as MysteryBox V3 (shared box logic) |
| SilverBox V2 | `0xc1b2ec...8f46`-owned instance | Same hardening; shares admin/guardian multisig with BlueBox by design, disclosed |

**Canonical rebuilt fleet (as shipped by `script/Deploy.s.sol`):** one broadcast deploys `BoxTokenRegistry`,
the two-source redundant oracle (`RolePriceSource` ×2 + `TokenPricer(admin, primary, secondary)`), **all 17
box variants** (MysteryBox, RedBox, BlueBox, GreenBox, WhiteBox, OrangeBox, YellowBox, PinkBox, PurpleBox,
RainbowBox, BlackBox, CheckeredBox, SilverBox, GoldBox, DiamondBox, RussianFlagBox, CoinGatchaBox), and
`ReferralToken` + `ReferralRegistry`. The script wires the `GUARDIAN_ROLE` (the §4 2-of-3 Safe) on every
pausable contract and the **executor on all 17 boxes at deploy time**, so a fresh fleet is deposit-ready (a
box without an executor reverts on every deposit); applies the CFO-signed caps from env values (`0` =
unlimited until set); grants `KEEPER_ROLE` to the two named keepers (one per source); then hands every
`DEFAULT_ADMIN_ROLE` to the multisig and renounces the deployer EOA's roles, asserting the renouncements
on-chain (N-2 — §4). The four legacy rows above document only the old deployments this fleet replaces.

**Non-negotiables for every contract:** Foundry project in this repo (`contracts/`, pinned
solc + OZ versions), full test suite (invariant tests where feasible), no admin path that can move user
funds, all privileged roles held by the 2-of-3 multisig from §4, NatSpec with trust assumptions.

**Process gates:** Chief Auditor reviews the rebuilt code before any deployment; deployments go to fresh
Sepolia addresses first, frontend `currencies.ts` updated in the same PR, pause drill executed (§6 step 5),
then the mainnet target per board schedule **only after the §6a pre-broadcast gates pass** (including the
CTO's per-contract fuzz re-run).

**Dependencies:** CFO cap amounts (contract-level enforcement needs values); multisig setup (§4) must
exist before deployment so guard roles can be assigned to it; CEO sign-off on this rebuild scope is
requested as part of §3 approval.
