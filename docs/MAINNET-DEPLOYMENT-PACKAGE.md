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

## 9. Live Sepolia fleet (OBS-321) — post-deployment configuration and gaps

The canonical Sepolia deployment is the **OBS-321 broadcast** (`a4e7642`, chain `11155111`, 169 txs,
nonces 15–183). Addresses, tx hashes and the incident record live in the
[OBS-321 broadcast reconciliation](/OBS/issues/OBS-321#document-broadcast-reconciliation). The three gaps
found after the broadcast by QA ([OBS-612](/OBS/issues/OBS-612)) and tracked in [OBS-621](/OBS/issues/OBS-621)
are recorded here so the next deployment is deposit-ready out of the box. This section is the authoritative
addition; §2 and §8 describe the pre-build plan and are superseded for the live fleet.

### 9.1 Pool-membership configuration step (required — the live fleet is NOT deposit-ready)

`script/Deploy.s.sol` registers tokens (`registerToken`) but **never calls `setPoolMembership`**, and the
NatSpec deliberately leaves pool membership as a "post-deploy admin decision". Result on the live fleet:
`BoxTokenRegistry.canUse(token, boxType)` is `false` for **every** pair (verified read-only 2026-11-01),
so every `deposit` reverts. This is a deployment-**process** gap, not a contract bug — no `contracts/src/**`
change is needed.

**Exact call set** — `ADMIN` = the registry `DEFAULT_ADMIN_ROLE` holder:

- Registry: `BoxTokenRegistry` `0x43Ff92ce3eC51c96FFD4031fc85f63ea2b6BEA1D`
- Registered tokens: native `address(0)` (18 decimals), USDC.e `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` (6), WETH `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9` (18), LINK `0x779877A7B0D9E8603169DdbD7836e478b4624789` (18)
- `setPoolMembership(BoxType box, address token, bool added)` is **per-pair only** — there is no batch
  function. For each of the 17 `BoxType` values and each registered token: `setPoolMembership(box, token, true)`.
  That is 17 × 4 = 68 calls. `BoxType` order: `RED, BLUE, GREEN, MYSTERY, WHITE, ORANGE, YELLOW, PINK, PURPLE,
  RAINBOW, BLACK, CHECKERED, SILVER, GOLD, DIAMOND, RUSSIAN_FLAG, COINGATCHA` (`0..16`).
- Verify afterwards: `canUse(token, boxType) == true` for every enabled pair and `info(token).active == true`;
  confirm nothing else in the fleet changed.

Sepolia test matrix — all registered tokens enabled on all 17 boxes (testnet config; per-box mainnet pools
remain a design decision from the box specs). Ready-to-run helpers:

- `contracts/script/ConfigurePools.s.sol` — Forge broadcast; issues the 68 calls and asserts all 68
  `canUse` pairs afterwards. Dry-run against Sepolia as the MULTISIG admin (no broadcast) produced
  68 transactions to the registry (selector `0xc4178c2b`), estimated total gas **5,034,364**, and
  verified all 68 pairs `canUse=true`. Re-run with `--with-gas-price 21 --priority-gas-price 1`.
- `scripts/configure-pools-sepolia.sh` — cast loop; same 68 calls, reads the admin key from
  `$ADMIN_KEY`/env only (never embedded), and re-verifies the matrix.

**Who can run it on the live fleet:** `setPoolMembership` is `onlyRole(DEFAULT_ADMIN_ROLE)`. The deployer EOA
`0x3539327E34a8262ec8b6F197B8F769660d0948fc` **renounced** `DEFAULT_ADMIN_ROLE` during the broadcast
(`RoleRevoked`, registry block 12040162); the sole holder is the Sepolia `MULTISIG` EOA
`0xCD63Bde25B9727bAA0A08bb6219a551262Ac8968` (derivation `m/44'/60'/0'/0/0`; on Sepolia this "2-of-3
multisig" is currently a **single EOA**, disclosed). The role-keys mnemonic is a managed secret still pending
acceptance; until it is bound, the pool config cannot be executed by the engineering agent. **The next
deployment should run this step BEFORE the admin handoff**, while the deployer still holds
`DEFAULT_ADMIN_ROLE`, so the fleet ships deposit-ready.

### 9.2 Sepolia executor is custody-by-design — never deploy it to mainnet

`TestnetSettlingExecutor` `0xc584a46b911EAfbBdB7fe6b59446a06509380287` is a **testnet-only** settling actor
that holds every pulled ERC-20 and every native deposit until the owner sweeps it. `owner` is the deployer EOA
`0x3539327E34a8262ec8b6F197B8F769660d0948fc` with **no rotation path**; `sweep()` is the only privileged
surface; `execute()` never pays the user. That custody model is acceptable for Sepolia value only and is
**explicitly excluded from mainnet**: the mainnet executor must instead pay the user within the atomic
deposit, hold no balance between transactions, and expose no unaccounted admin fund-movement path (or a
disclosed, time-locked one).

### 9.3 Forge gas-limit finding (from the OBS-321 broadcast)

The local estimate for the executor `CREATE` was **~7× low** versus the fee actually required on Sepolia. In
this forge version (`forge 1.8.6`), `--gas-price` does **not** lower the effective fee while
`--with-gas-price` does. Note both before any re-deploy; the working broadcast command used
`--with-gas-price 21 --priority-gas-price 1 --gas-estimate-multiplier 800 --disable-block-gas-limit
--disable-code-size-limit --slow`.

### 9.4 Caps in force until the external audit (G5) clears — explicit statement

The Sepolia caps actually in force on the OBS-321 fleet (CFO [OBS-288](/OBS/issues/OBS-288); parity verified
on-chain) are:

```
VAR_CAP_USD=10000000000     # $100 total value-at-risk, PER BOX CONTRACT (fleet aggregate = 17 x this)
TX_CAP_USD=2000000000       # $20 per transaction
WALLET_CAP_USD=5000000000   # $50 per wallet
ETH_PRICE_USD=300000000000  # $3,000 seed (keepers refresh within 1h)
```

Caps are stored **per box contract**, so the fleet-wide value-at-risk is `17 × VAR_CAP_USD`. On-chain a cap of
`0` means **unlimited** (`MysteryBoxBase._checkDepositCaps` skips zero caps) — **never pass `0` for a cap on a
real deployment.** The caps remain in force, unchanged, until the independent external audit (G5) reports
**zero open critical/high findings**; no cap increase is authorized before that gate passes. Mainnet remains
**CLOSED** until the board schedules it.
