# phreaking.fun — Mystery Box UX flows and copy deck

**Owner:** Product Designer (UI/UX & Brand) · **Task:** OBS-177
**Status:** Design v1.1 — CPO-approved copy changes applied · **Contract branch:** `build-day-boxes`
**Source of truth:** `box-specs` issue document on OBS-129 (Drive guides + CEO build decisions, 2026-10-29)

> Sepolia-only until the external audit clears. Nothing in this document authorises mainnet
> deployment or live bridge/NFT/Secret Network execution. Yellow and Pink are intentionally
> out of scope: no confirmed mechanics yet.

---

## 1. What this document is

This is the UX/UI contract between design and frontend engineering for the mystery-box
product. It defines:

- the box catalogue and the mechanic copy shown to users;
- one shared transaction state machine with per-box overrides;
- each screen, its content hierarchy, required states, and acceptance criteria;
- the trust/safety requirements for signing and irreversible actions;
- the design tokens and components to build;
- the handoff checklist and open decisions.

A clickable, simulated prototype lives at **`/design/box-flows`**. It renders every screen in
this document with demo-only data and never sends a transaction. It exists so reviewers can
walk the flows before wiring contracts.

---

## 2. Design principles

1. **No surprise outcomes at signing time.** Every screen that asks for a signature states what
   leaves the wallet, what comes back, what is random, and what is irreversible.
2. **Separate approval from execution.** "Confirm in wallet" and "transaction executing" are
   visually distinct states. Never show a success animation while a wallet prompt is still open.
3. **Irreversibility is explicit, not decorative.** Black, Rainbow, Checkered, and Russian Flag
   require an acknowledgement checkbox with plain-language consequences.
4. **The box is the hero, the contract is the receipt.** Colour and motion sell the box; the
   review screen is deliberately quiet, monospaced, and scannable.
5. **Truthful progress.** The finality overlay shows stages the system can actually observe.
   Unknown stages say "waiting", not a fake percentage.
6. **Accessible by default.** Every status has text plus icon, every control is keyboard
   reachable, motion respects `prefers-reduced-motion`, and contrast meets WCAG AA.
7. **One mechanic, one sentence.** A user should be able to explain a box after reading one
   line. Long-form detail is optional, never required to understand the trade.

---

## 3. Information architecture

```
/ (home)
└── Toolkit catalogue
    ├── CORE        Mystery Box
    ├── REFRESH     Red · Blue · Green · Orange · Purple
    ├── ADRENALINE  White · Black · Rainbow · Checkered · Russian Flag
    ├── VIBE        Silver · Gold · Diamond        (UNITE-gated; lock + blur)
    └── ARCADE      CoinGatcha
```

- The catalogue is grouped by toolkit, matching the one-pager's design update.
- Selecting a box opens the flow as a modal over the catalogue; the page edge fades to the
  box accent (spec: "selected box border glows and page edges fade to that color").
- The modal keeps the catalogue visible behind a dimmed, motion-blurred layer so the user never
  loses context.
- Vibe boxes stay visible but locked until the wallet holds ≥ 10,000 UNITE. Locked cards show
  the requirement, a lock icon, and a blurred preview; no dead-end click.
- Yellow and Pink are **not rendered** in v1. When mechanics are confirmed they get cards and
  copies in this document before implementation.

### 3.1 Catalogue copy rules

Each card carries four elements, in this order:

1. **Box name** — e.g. `RED BOX`.
2. **Mechanic label** — 1–3 words, e.g. `1:1 TOKEN SWAP`.
3. **One-line mechanic** — what the user gives and gets.
4. **Risk/eligibility chip** — only when it changes the decision (`RANDOM`, `IRREVERSIBLE`,
   `24H LOCK`, `UNITE 10K`).

The hover state (desktop) or expanded state (mobile) adds the long copy from §4.3.

---

## 4. Box catalogue

### 4.1 Catalogue table

| # | Box | Toolkit | Mechanic label | Deposit | Returns | Risk chip |
|---|-----|---------|----------------|---------|---------|-----------|
| 1 | Mystery Box | Core | Random swap | 1–4 tokens | One random pool token | `RANDOM` |
| 2 | Red | Refresh | 1:1 token swap | One whole token | One whole token, native or cross-chain | — |
| 3 | Blue | Refresh | Portfolio offer | Multi-token lot | Different basket, same USD ±1% | — |
| 4 | Green | Refresh | Shitcoin recycler | Old tokens | Newer tokens meeting eligibility | — |
| 5 | Orange | Refresh | Shit-to-Bit | Dust / selected coins | WBTC | — |
| 6 | Purple | Refresh | NFT highway | NFTs or altcoins | Altcoins or NFTs of similar value | — |
| 7 | White | Adrenaline | Donate | Any token | Charity donation, anonymous | `NO RECEIPT` |
| 8 | Black | Adrenaline | Rage quit | Entire wallet | Harold NFT with USD value sent | `IRREVERSIBLE` |
| 9 | Rainbow | Adrenaline | Anything goes | 1–4 tokens | Output of a randomly fired box | `RANDOM` |
| 10 | Checkered | Adrenaline | Portfolio shuffle | Entire portfolio | Another player's portfolio | `IRREVERSIBLE` |
| 11 | Russian Flag | Adrenaline | 24h GMX trade | USDC value | Long/short PnL after 24h, profit taxed | `24H LOCK` |
| 12 | Silver | Vibe | Majors mirror | Any tokens | Top-50 VC/hedge-fund basket | `UNITE 10K` |
| 13 | Gold | Vibe | Microcap mirror | Any tokens | Sub-$30M market-cap basket | `UNITE 10K` |
| 14 | Diamond | Vibe | 1000x or death | Any tokens | Sub-$10M basket, TWAP over 24h | `UNITE 10K` |
| 15 | CoinGatcha | Arcade | Claw machine | $1 / $10 / $100 | Coin inside the grabbed ball | `ARCADE` |

### 4.2 Mechanic copy (card, one line)

- **Mystery Box** — "Deposit crypto. Receive one random token from the live pool."
- **Red Box** — "Deposit one whole token. Receive one whole token — same chain or cross-chain."
- **Blue Box** — "Deposit a lot of tokens. Accept a dollar-value offer for a different basket."
- **Green Box** — "Trade old shitcoins for newer ones that pass the age and volume screen."
- **Orange Box** — "Sweep dust and selected coins into WBTC."
- **Purple Box** — "Dump unwanted NFTs for altcoins — or flip altcoins into NFTs."
- **White Box** — "Donate crypto to a random charity through TheGivingBlock."
- **Black Box** — "Throw your entire wallet into the black hole. Keep a Harold NFT as the receipt."
- **Rainbow Box** — "Approve once. A random box fires — you won't know which until it lands."
- **Checkered Box** — "Trade your whole portfolio with another player. No takebacks."
- **Russian Flag** — "A random 24-hour GMX long or short on Russian-developed coins."
- **Silver Box** — "Swap into the top coins held by hedge funds and VCs."
- **Gold Box** — "The same mirror, aimed at microcaps under $30M."
- **Diamond Box** — "Dollar-for-dollar into sub-$10M coins, filled over 24 hours."
- **CoinGatcha** — "Grab a ball. Keep the coin inside."

### 4.3 Long copy (catalogue detail / tooltip)

**Mystery Box** — "The truest mystery. Deposit one to four tokens and receive a randomly
selected token from the active pool. The output is not known when you sign."

**Red Box** — "One whole token in, one whole token out. Choose **Native** to stay on your
current chain, or **Cross-chain** to route through Axelar/Synapse to a wider pool. Example:
1 AVAX can return 1 BAX or 1 WBTC."

**Blue Box** — "Deposit a multi-token lot and receive a dollar-value offer. Accept it to get a
different basket worth the same USD, within ±1% slippage. This is a portfolio swap, not a
stablecoin trade."

**Green Box** — "The shitcoin recycler. Send old tokens and receive newer ones. Eligible
receipts must be from a token contract younger than two years with at least $100k average
daily volume over the past 90 days."

**Orange Box** — "Shit-to-Bit. Select dust positions or individual coins and convert the lot
to WBTC. Useful for cleaning a wallet without bridging each asset by hand."

**Purple Box** — "The NFT ↔ altcoin highway. Dump unwanted NFTs for altcoins of similar dollar
value, or spend altcoins to receive NFTs. When possible, altcoin dumps sweep the floor of the
Black Box Harold collection."

**White Box** — "Donate crypto to a randomly selected charity through TheGivingBlock. Funds are
swapped to USDC and donated anonymously. **No tax receipt is issued.** If you need a receipt,
donate directly through TheGivingBlock instead."

**Black Box** — "Rage quit. Every token in the connected wallet is swept into a one-time deposit
address, valued in USD, and sent to the dev black hole. You receive a Hide The Pain Harold NFT
with the USD value printed in the corner. This is irreversible and zeroes the wallet's
balances."

**Rainbow Box** — "Approves a transaction that randomly triggers one of the other boxes. The
deposit rules of the fired box apply. You will not know which box fired until the result
screen."

**Checkered Box** — "Shuffle your hand with someone else's. Two players escrow their entire
portfolios and swap them. Value may be higher or lower. Once matched, there are no takebacks."

**Russian Flag** — "Funds are converted to USDC, then a random 2–10 leverage long is placed on
GMX (Arbitrum) across Russian-developed coins: ETH, SOL, LINK, AAVE, TON, XMR. There is a 1 in
6 chance the position goes short. The trade closes after 24 hours. Positive PnL is taxed:
13% under 2.4%, 15% from 2.4% to 50%, 22% above 50%."

**Silver Box** — "Copy the majors. Swap into a top-50 whitelist drawn from hedge-fund and VC
portfolios, rebalanced annually. Suggested weights: 50% wBTC, 20% ETH, 10% LINK, 5% ONDO,
5% MKR, 2% UNI, 2% AAVE, 2% AVAX, 2% ENA, 2% SEI."

**Gold Box** — "Copy the microcaps. Same mechanic as Silver, limited to coins under a $30M
market cap and drawn from public portfolios including Pantera, a16z, Sequoia, Framework,
Binance Labs, OKX Ventures, and others."

**Diamond Box** — "The highest-risk mirror. Dollar-for-dollar into coins under a $10M market
cap, at least $10k daily volume over 90 days, younger than three years. Fills are TWAP'd over
24 hours with slippage capped at 1%; you may receive several small bags."

**CoinGatcha** — "A claw machine for coins. Deposit, grab a ball, and receive the coin inside.
Three machines at $1, $10, and $100 per grab. Prize inventory is pre-funded and static; a ball
can be worth more than the grab price. 3% swap markup and 10% gas premium apply."

### 4.4 Category-level notices

- **Refresh Toolkit** — "Swap, recycle, or clean up. Outputs are market-priced; nothing here
  is a guaranteed return."
- **Adrenaline Toolkit** — "Higher variance. Some actions are irreversible or time-locked.
  Read the review screen."
- **Vibe Toolkit** — "Copy-trade mirrors. Requires 10,000 UNITE staked. Weights are
  configuration, not a promise of performance."
- **Arcade** — "Fixed-price grabs. Prize inventory is visible and pre-funded."

---

## 5. Shared flow state machine

```
                 ┌──────────────┐
                 │   BROWSE     │
                 └──────┬───────┘
                        │ select box
                 ┌──────▼───────┐   not connected   ┌──────────────┐
                 │  CONFIGURE   ├──────────────────►│ CONNECT      │
                 └──────┬───────┘                   └──────┬───────┘
                        │ valid input                    │ connected
                        │                                └──────► CONFIGURE
                 ┌──────▼───────┐
                 │   REVIEW     │  ◄── quote refresh / toggle change
                 └──────┬───────┘
                        │ confirm
                 ┌──────▼───────┐
                 │ WALLET SIGN  │  (MetaMask / Phantom prompt)
                 └──────┬───────┘
             reject ────┤ submitted
                 │       ▼
        ┌────────▼──┐ ┌──────────────┐
        │  REVIEW   │ │  FINALITY    │  (observed stages)
        └───────────┘ └──────┬───────┘
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              ┌──────────┐      ┌──────────┐
              │  RESULT  │      │  ERROR   │
              └──────────┘      └────┬─────┘
                                     │ retry / back
                                     └──────► CONFIGURE
```

Rules:

- `CONFIGURE` is the only step that can be reopened without losing input.
- Changing an input or toggle on `REVIEW` returns to `CONFIGURE` with a "Quote updated" notice.
- A quote is valid for 60 seconds; after 30 seconds show "Quote expires in 30s" and a
  `Refresh quote` action.
- `FINALITY` cannot be dismissed by backdrop click or `Esc`. The close control becomes
  "Hide" and a persistent banner says the transaction continues in the background.
- `RESULT` and `ERROR` are the only terminal states; closing them returns to `BROWSE`.
- Deep-linking to a box is supported (`/?box=red`); an unknown box falls back to the catalogue.

### 5.1 Step labels (progress indicator)

| Step | Label | Screen reader announcement |
|------|-------|----------------------------|
| Configure | `01 CONFIGURE` | "Step 1 of 4: configure your deposit" |
| Review | `02 REVIEW` | "Step 2 of 4: review and sign" |
| Sign | `03 SIGN` | "Step 3 of 4: confirm in wallet" |
| Finality | `04 FINALITY` | "Step 4 of 4: transaction executing" |
| Result | `DONE` | "Transaction complete" |

Steps that do not apply are omitted, not greyed (e.g. White has `CHARITY` before `REVIEW`;
Russian Flag ends in `POSITION OPEN` rather than `RESULT`).

---

## 6. Screen specifications

### 6.1 Box selection (catalogue)

**Purpose:** choose a box and understand its mechanic in under five seconds.

**Layout**
- Full-bleed terminal-black page, `font-mono`, existing 1990s phreaking aesthetic.
- Sepolia banner stays pinned above the catalogue: "Sepolia testnet demo — never send real
  funds." It must not be dismissible.
- Toolkit sections stack vertically; each has a label row and a responsive card grid.
- Card: 220×260 desktop, full-width mobile. Top label bar, box art, mechanic label,
  one-line copy, risk chip, `SELECT` affordance.
- Hover/focus: border glows in the box accent; page edge gains a 40px accent gradient at ≤8%
  opacity. `prefers-reduced-motion` disables the glow transition.
- Selected/open card: 2px accent border, subtle inner scanline, `aria-expanded="true"`.

**States**
- Default, hover/focus, locked (Vibe), unavailable/spec-pending, loading (balance check while
  locked), error (balance check failed → still allow preview, but block the signature step).
- Empty catalogue is not a valid state; if config fails, render a static fallback list from
  the bundled catalogue and log an error.

**Acceptance**
- All 15 specified boxes render from a single config source.
- Every card has a one-sentence mechanic and a mechanic label.
- Locked Vibe cards are focusable and explain the unlock requirement.
- No Yellow or Pink card exists in v1.

### 6.2 Wallet connect

**Purpose:** connect MetaMask or Phantom without implying chain support that does not exist.

**Content**
- Modal title: `CONNECT WALLET`.
- Two primary options:
  - **MetaMask** — "EVM wallets. Recommended."
  - **Phantom** — "EVM mode on Ethereum and supported EVM chains. Solana flows are not live
    yet."
- A network guard line: `NETWORK: SEPOLIA (11155111) — REQUIRED`.
- Footer: "phreaking.fun will never ask for your seed phrase. Approve only the transaction
  shown in your wallet."
- If the connected wallet is on the wrong chain, show a blocking `SWITCH NETWORK` state with
  the target chain and a single action.

**Acceptance**
- Wallet names are text, not colour-only logos.
- Wrong-network state blocks progression and names the required chain.
- No "connect" copy promises Solana execution while adapters are stubbed.

### 6.3 Configure

**Purpose:** collect the deposit, expose box-specific choices, and surface eligibility before
the user commits.

**Shared structure**
1. Header: box name + mechanic label + step indicator.
2. Box art or result preview (right column desktop, top mobile).
3. Deposit editor (left column).
4. Box-specific module (§6.3.1).
5. Quote summary: estimated output, fees, network, route, quote freshness.
6. Primary action: `REVIEW` (disabled until valid) with inline reason.
7. Secondary: `CANCEL` / `EXIT`.

**Deposit editor**
- Single-asset boxes: token selector + amount + `MAX` + balance line.
- Multi-asset boxes (Mystery, Blue, Rainbow, Silver, Gold, Diamond): 1–4 rows, each with
  token, amount, balance, remove; `+ ADD TOKEN` up to 4. Duplicate tokens are disallowed with
  an inline message.
- Wallet-sweep boxes (Black, Checkered): no amount inputs. Show a read-only asset list with
  USD values, total, and a chain coverage note ("Ethereum + supported EVM chains").
- NFT boxes (Purple): grid of NFTs with floor estimate; multi-select up to 5.
- No-input boxes (White charity random, CoinGatcha): hide the editor, show the choice module.

**Validation**
- Inline, on blur and on submit, never a toast for field-level errors.
- Amount > balance: "Insufficient {TOKEN}. You have {balance}."
- Zero/negative: "Enter an amount greater than zero."
- Below box minimum: "{BOX} needs at least {min} {TOKEN}."
- No asset selected: "Select at least one asset."
- Ineligible asset (Green): see §6.3.1.

**Quote block**
```
EST. RECEIVE      ~ 1.000 BAX
ROUTE             Sepolia → (demo) Axelar → Sepolia
NETWORK FEE       0.0012 ETH + 5% premium
PLATFORM FEE      5% of output (shown in output token)
QUOTE EXPIRES     00:47
```
Fees must name the asset and whether they are taken from input or output. "Gas + 5% premium
charged in the native gas token" per the one-pager.

**Acceptance**
- At most four asset rows.
- Every disabled primary action has a visible reason.
- Quote shows route, both fee lines, and expiry.
- Editing any input invalidates the quote and re-fetches.

#### 6.3.1 Box-specific modules

**Red — native vs cross-chain toggle**
- Segmented control: `[ NATIVE ]  [ CROSS-CHAIN ]`.
- `NATIVE`: helper "Stay on {chain}. Fastest, lowest fee." Pool list filtered to the chain.
- `CROSS-CHAIN`: helper "Route to a wider pool through Axelar or Synapse. Adds bridge time
  and fee." Show a chain selector.
- The toggle is an input; changing it updates the quote and route. It never changes by itself.
- Routing is off-chain executor behaviour; the UI only exposes the choice and displays the
  returned route.

**Blue — dollar-value offer**
- After assets are entered, show `OFFER` card: total USD in, offered basket, each token's USD
  value, and a `±1%` slippage band.
- Actions: `ACCEPT OFFER` and `REQUEST NEW OFFER`. The latter re-quotes without resetting
  assets.
- If the offered total is outside ±1%, block acceptance and show "Offer refreshed — review the
  new value."
- Offer has a 60-second timer; expiry disables `ACCEPT OFFER` and shows `REFRESH`.

**Green — eligibility screen**
- Each asset gets a status row: `AGE < 2Y` / `VOLUME ≥ $100K / 90D` with pass/fail icons.
- If any asset fails, it stays in the list with a red status and `REMOVE` action; the primary
  action is disabled until all listed assets pass.
- Receipts are not guaranteed to be new tokens; show "Receipts are screened by contract age and
  90-day volume. Screening is not an endorsement."

**White — charity selection**
- Mode toggle: `[ RANDOM CHARITY ]  [ CHOOSE CHARITY ]`.
- Random: single confirmation row, "A charity will be selected at random by TheGivingBlock
  when the donation executes."
- Choose: searchable list of eligible charities; selecting one pins the recipient.
- The donation asset defaults to ETH and can be swapped to USDC by the executor; show
  "Donated as USDC".

**Purple — mode toggle**
- Segmented control: `[ NFTs → ALTCOINS ]  [ ALTCOINS → NFTs ]`.
- NFTs → altcoins: NFT grid multi-select; show floor value and total.
- Altcoins → NFTs: asset rows plus an NFT collection preference; show "Floor sweep" option
  with "May sweep Black Box Harold NFTs first when available."
- A "similar value" band is shown as ±10% and labelled "estimated, not guaranteed."

**Black — wallet sweep**
- Read-only list of every detected asset and USD value, grouped by chain.
- Total USD is prominent; it is the number that will appear on the NFT.
- Warning block (amber): "This sweeps the entire wallet. Tokens you want to keep must be moved
  to another wallet first. This cannot be undone."
- Acknowledgement checkbox: "I understand this is irreversible and will zero my balances."
- The review screen repeats the total and the warning; the signature step links back to the
  asset list.

**Checkered — matchmaking**
- Step 1: configure your portfolio escrow.
- Step 2: `WAITING FOR COUNTERPARTY` state with elapsed time and a cancel action.
- Once matched: show both portfolios' USD values and a 30-second `ACCEPT MATCH` window.
- Declining returns to the queue without penalty; accepting is irreversible.
- On Sepolia, label matchmaking "demo simulator" because no counterparty pool exists.

**Russian Flag — position**
- Deposit in USDC-equivalent; show conversion.
- Show the coin basket, the 24-hour lock, the 1-in-6 short chance, and the tax table:
  `PnL < 2.4% → 13%` · `2.4%–50% → 15%` · `> 50% → 22%`.
- Required acknowledgement: "I understand my funds are locked for 24 hours and profit is
  taxed."
- Result is `POSITION OPEN`, not a finished swap: entry price, direction, expiry countdown,
  and "You will return to close the position after 24 hours."

**Silver / Gold / Diamond — mirror disclosure**
- Show the target basket with weights and USD allocation for the entered amount.
- Diamond adds: "Fills over 24 hours. Slippage capped at 1% per coin. You may receive multiple
  small bags."
- If UNITE < 10,000: replace configure content with the unlock state; link to staking.

**CoinGatcha — claw machine**
- Machine selector: `$1` / `$10` / `$100`, each showing ball inventory and top prize.
- A claw animation plays only after the grab transaction is submitted; do not simulate
  gameplay before payment.
- Show `3% markup + 10% gas premium` in the quote.

### 6.4 Review / confirm

**Purpose:** the trust screen. A user who reads only this screen should make an informed
decision.

**Structure (top to bottom)**
1. Title: `REVIEW {BOX NAME}`.
2. `YOU SEND` block: asset rows + total USD.
3. `YOU RECEIVE` block: estimated asset(s) + USD, or a clear unknown for random boxes.
4. `ROUTE` block: source chain → bridge (if any) → destination chain, executor label.
5. `FEES` block: network fee + 5% premium, platform fee, any box-specific tax.
6. `RISKS` block: 1–3 box-specific warnings.
7. For irreversible boxes: acknowledgement checkbox.
8. Primary: `CONFIRM IN WALLET`; secondary: `BACK`.
9. Fine print: "By confirming, you authorise the transaction above. Token values can change
   before execution."

**Random-box treatment (Mystery, Rainbow)**

Mystery:
- `YOU RECEIVE` shows `??? — one token from the {N}-token pool`.
- Below it: `POSSIBLE OUTPUTS` with up to six token logos and "+{n} more".
- Required acknowledgement: "I understand the output is random and cannot be chosen."

Rainbow (trust-critical — the fired box's rules apply, including Black's wallet sweep):
- `YOU RECEIVE` shows `??? — the output of a randomly fired box. Its deposit rules apply.`
- Below it: `Possible outcomes: any other box can fire — from a 1:1 token swap (Red) to a full wallet sweep (Black).`
  Do not show a token-list "possible outputs" for Rainbow.
- Add warning line: `If Black Box fires, the sweep covers your entire wallet — not just the assets you deposited.`
- Required acknowledgement: "I understand a random box will fire and I cannot choose it."
- CTO action: confirm the on-chain fireable set of `RainbowBox` (Black included?) so the copy
  states what the contract actually does.

**Irreversible treatment (Black, Checkered, Russian Flag)**
- Amber warning block with icon and heading `THIS CANNOT BE UNDONE`.
- Checkbox is required; primary stays disabled with reason `Acknowledge the warning to
  continue`.
- Do not use red for normal risk (red is reserved for errors); use amber.

**White confirm page — required verbatim language**
- Place the following block immediately above the confirmation control, in a bordered panel,
  at ≥14px, without truncation:

> if you wish to generate a tax receipt or wish for further information, visit
> thegivingblock.com and donate directly through their platform. For anonymous fast donations
> without tax receipts, please proceed here

- `thegivingblock.com` is a link to `https://thegivingblock.com`; the sentence text must not be
  edited, shortened, or re-capitalised.
- Add a second line below, clearly separated as product copy (not part of the quote):
  "Donations made here are anonymous and do not generate a tax receipt."
- Required acknowledgement: "I understand this donation is anonymous and I will not receive a
  tax receipt."

**Acceptance**
- Send and receive are visually separated and never merged into one line.
- Random and irreversible boxes cannot proceed without acknowledgement.
- White's quoted language matches the spec character-for-character (test with a snapshot).
- The review screen is reachable with keyboard only and the checkbox has a visible focus ring.

### 6.5 Wallet signature

**Purpose:** bridge the app and the wallet without pretending the transaction happened.

**Content**
- Title: `CONFIRM IN {WALLET}`.
- Wallet name and network.
- One-line summary: "{amount} {token} → {box name}".
- "Waiting for your wallet…" with a spinner and a `Cancel` action.
- If the user rejects: return to `REVIEW` with an informational message, not an error toast:
  "Signature cancelled. Nothing was sent."
- If the wallet is unresponsive for 60s: "Still waiting. Open {wallet} to review the request."
- Never show a progress bar here.

**Acceptance**
- Cancel returns to Review with inputs intact.
- Rejection is not styled as a failure.
- No success state is reachable before a submitted transaction hash exists.

### 6.6 Finality overlay

**Purpose:** show that the transaction is executing and what stage it is in.

**Visual**
- Full-modal overlay in the box accent, black core, animated scanline (disabled under reduced
  motion).
- Large status line, stage list, and elapsed timer.
- A `HIDE` control that collapses to a persistent bottom bar: "{BOX} executing — {stage}".
- No fake percentage. If the executor reports progress, show it; otherwise show stages.

**Stage model**
```
SUBMITTED → ROUTING → SWAPPING → SETTLING → FINALIZED
```
- Bridge boxes insert `BRIDGING` between ROUTING and SWAPPING.
- Black inserts `SWEEPING` and `MINTING NFT`.
- Russian Flag ends at `POSITION OPEN` instead of `FINALIZED`.
- Checkered shows `WAITING FOR COUNTERPARTY` before `SETTLING`.
- Each stage: `done` (filled), `active` (pulsing), `pending` (dim). Text accompanies every
  state.
- Copy under the list: "Keep this tab open. You can hide this panel; the transaction will
  continue."

**Acceptance**
- The overlay cannot be dismissed by backdrop or `Esc`.
- Stage text is announced through `aria-live="polite"` (not every animation frame).
- If a stage exceeds its expected time, show "Taking longer than usual" with a support link.

### 6.7 Result

**Purpose:** tell the user exactly what they received and how to verify it.

**Structure**
1. `COMPLETE` eyebrow + box name.
2. Received asset: icon, amount, USD value at execution.
3. `TX ROUTE`: source → bridge → destination; executor; timestamp.
4. Links:
   - `VIEW ON COINGECKO` → `https://www.coingecko.com/en/search?query={symbol}`
   - `VIEW ON DEXSCREENER` → `https://dexscreener.com/search?q={symbol}` (only when a DEX
     pair exists; otherwise hide the link, do not disable it silently)
   - `VIEW TRANSACTION` → block explorer for the destination chain
   - `COPY TX HASH`
5. For multi-asset results: a list of received tokens, each with its own links.
6. Secondary actions: `OPEN ANOTHER {BOX}` (prefills the same box), `BACK TO TOOLKIT`.
7. White: `DONATION COMPLETE` variant with charity name, amount, anonymous/no-receipt reminder,
   and the same quote language in fine print.
8. Black: Harold NFT card with the NFT image, `VALUE AT SWEEP: $X,XXX.XX` pinned in the
   upper-right corner of the card, token ID, and `VIEW NFT` link.
9. Russian Flag: `POSITION OPEN` variant with direction, entry, 24h countdown, and a note that
   the result arrives after close.
10. Rainbow: include `TRIGGERED BOX: {box}` above the received asset.

**Acceptance**
- Every result names the received asset and the route.
- Links are real anchors with accessible names; no `javascript:` or placeholder `#`.
- Missing Dexscreener data hides the link rather than showing a dead control.
- Black's USD value is rendered in the corner of the NFT card and mirrored in text for screen
  readers.

### 6.8 Error and recovery

**Purpose:** distinguish "nothing happened" from "funds moved but the swap failed".

**Error classes**
| Class | Example | Copy | Primary action |
|-------|---------|------|----------------|
| User rejected | wallet cancel | "Signature cancelled. Nothing was sent." | `BACK TO REVIEW` |
| Pre-flight | insufficient balance, wrong network | field-level reason | fix input |
| Reverted | contract revert | "Transaction reverted. Your deposit was not taken." | `TRY AGAIN` |
| Stuck | bridge/executor timeout | "Still processing. Your funds are in the route, not lost." | `CHECK STATUS` |
| Partial | some assets swapped | "Partial fill: 2 of 3 assets settled." | `VIEW DETAILS` |
| Ineligible | Green asset fails screen | "This token does not meet the recycler criteria." | `REMOVE ASSET` |

Rules:
- Show the transaction hash and explorer link whenever one exists.
- Never say "funds are safe" unless the system can prove the transaction reverted or was never
  submitted. For uncertain states, say "Your funds are in the route. We are checking."
- Keep the user's inputs for retry.
- `TRY AGAIN` resets only the failed step; it does not re-charge.
- Offer a copyable support reference: `BOX-{id} / TX {hash} / {timestamp}`.

---

## 7. Design system

### 7.1 Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--terminal-black` | `#000000` | page background |
| `--terminal-green` | `#22e584` | primary UI, focus, success |
| `--terminal-green-dark` | `#175a38` | secondary text, borders |
| `--terminal-white` | `#ffffff` | body copy on black |
| `--terminal-orange` | `#FD9C26` | processing, amber warnings |
| `--terminal-red` | `#9C001D` | errors only |
| `--box-accent` | per box | selected glow, finality, result |
| `--radius` | `8px` | cards; cut corners come from clip-path |
| spacing | 4px base, 8/12/16/24/32/48 | layout |
| font | Geist Mono / `font-mono` | all product UI |
| focus ring | 2px white + 2px offset | all interactive elements |

Box accents: Red `#FF3B30`, Blue `#2F6BFF`, Green `#16A34A`, Orange `#FD9C26`,
Purple `#A855F7`, White `#FFFFFF`, Black `#FFFFFF` on black, Rainbow gradient,
Checkered `#E5E7EB`, Russian Flag `#D52B1E`, Silver `#C0C0C0`, Gold `#D4AF37`,
Diamond `#7DD3FC`, CoinGatcha `#F59E0B`, Mystery `#22E584`.

### 7.2 Components to build

| Component | Notes |
|-----------|-------|
| `BoxCard` | name, art, mechanic, risk chip, locked state, keyboard select |
| `ToolkitSection` | label + grid + category notice |
| `BoxFlowModal` | focus trap, Esc rules per step, scroll lock, accent theming |
| `StepIndicator` | text labels + current step; not colour-only |
| `AssetRow` | token, amount, balance, max, remove, error |
| `AssetSummary` | read-only sweep list with chain grouping |
| `SegmentedToggle` | Red native/cross-chain, Purple mode, White charity mode |
| `QuotePanel` | receive, route, fees, expiry |
| `RiskNotice` | amber irreversible block |
| `AcknowledgementCheckbox` | required, error on submit |
| `VerbatimQuote` | White receipt language, snapshot-tested |
| `FinalityOverlay` | stage list, aria-live, hide-to-bar |
| `ResultCard` | asset, USD, route, links, multi-asset list |
| `HaroldNftCard` | NFT art + USD value corner + text alternative |
| `ErrorPanel` | class-specific copy and recovery |
| `WalletConnectDialog` | MetaMask/Phantom, network guard |

### 7.3 Accessibility

- Dialog: `role="dialog"`, `aria-modal="true"`, labelled by the box title, initial focus on
  the heading or first input, focus trap, restore focus on close.
- `Esc` closes Configure/Review/Result; it does not close Finality.
- All icon-only controls have `aria-label`.
- Status uses icon + text; never colour alone.
- `aria-live="polite"` for quote freshness, stage transitions, and result announcements.
- Minimum target 44×44px; visible focus ring; no keyboard traps.
- Reduced motion: disable scanline, box glow transition, claw animation, and stage pulse.
- Contrast: white/green on black meets AA; amber warning text uses `#FD9C26` on `#1A1206`
  with bold weight; do not put red text on black below 16px.
- English first; layout tolerates +40% string length for Chinese, Spanish, Vietnamese, Russian, Arabic.
  Arabic requires RTL mirroring of the flow shell; do not mirror numbers or tx hashes.

### 7.4 Responsive

- ≥1200px: 3-column card grid; modal is 720px wide, two-column configure.
- 768–1199px: 2-column grid; modal 640px, stacked configure.
- <768px: 1-column grid; modal becomes a full-height sheet; primary action is sticky at the
  bottom; finality overlay is full-screen.
- No horizontal scrolling at 320px.

---

## 8. Trust, safety, and phishing resistance

These are requirements, not suggestions:

1. **Wallet prompts are the source of truth.** Every confirmation screen repeats the wallet's
   requested action in plain language, including the target contract name.
2. **Never request a seed phrase, private key, or unlimited approval** in copy or UI. If a
   token approval is needed, show `APPROVE {TOKEN}` as a separate step with the exact amount,
   and explain why.
3. **Display the destination chain and address** for cross-chain and sweep flows; truncate
   with a copy button, never hide the full value from assistive tech.
4. **No countdown pressure** on irreversible actions. Quote expiry may count down; the
   confirmation itself may not.
5. **No fake urgency, no fake winners, no fabricated activity.** Live stats must be labelled
   with their source and timestamp.
6. **Randomness disclosure.** Mystery and Rainbow must state the output is random before the
   user signs; never imply a higher chance of a valuable token.
7. **Financial claims.** Do not promise returns, APY, or "1000x" as an outcome. Diamond's
   "1000x or death" is a box name, not a claim; accompany it with the risk copy.
8. **Donation integrity.** White never implies a tax deduction; the verbatim language and
   acknowledgement are mandatory.
9. **Black Box consequence.** The sweep total shown on the review screen must match the total
   used for the NFT; if it changes, re-review before signing.
10. **Sepolia gate.** All flows remain visibly testnet-gated until the audit clears. No
    production-looking success state on testnet without the banner.

---

## 9. Engineering handoff

### 9.1 Contract mapping

| UI flow | Contract | Notes |
|---------|----------|-------|
| Mystery | `MysteryBox` | random pool token |
| Red | `RedBox` | native/cross-chain toggle is UI input |
| Blue | `BlueBox` | offer acceptance + ±1% band |
| Green | `GreenBox` | age/volume eligibility |
| White | `WhiteBox` | donation adapter; verbatim quote |
| Orange | `OrangeBox` | WBTC output |
| Purple | `PurpleBox` | NFT adapter |
| Rainbow | `RainbowBox` | random box selector; return triggered box id |
| Black | `BlackBox` | sweep + NFT mint; USD value |
| Checkered | `CheckeredBox` | two-party escrow + matching |
| Silver / Gold / Diamond | mirror boxes | whitelist/weights config; Diamond TWAP |
| Russian Flag | `RussianFlagBox` | strategy vault; 24h close; fee tiers |
| CoinGatcha | `CoinGatcha` | three machines; static inventory |

All boxes inherit `MysteryBoxBase`: guardian pause, timelocked unpause, USD tx/VaR/wallet caps.
The UI must render paused and cap-reached states:

- **Paused** — banner "This box is paused by the guardian. No new deposits." Primary disabled.
- **Cap reached** — "This box has reached its {tx/VaR/wallet} cap. Try a smaller amount or
  another box." Show which cap.
- **Unpause pending** — "Paused. Unpause is timelocked until {time}."

### 9.2 Backend/executor data needed

- Quote: output estimate, route, fees, expiry.
- Execution stages per box (see §6.6) and terminal status.
- Result: received assets, amounts, USD at execution, tx hashes per chain, route, triggered box
  for Rainbow, NFT metadata for Black/Purple, donation metadata for White.
- Eligibility: Green asset age + 90-day volume; Blue offer; Vibe UNITE balance.
- Pool metadata: symbol, name, logo, CoinGecko id, Dexscreener availability.

### 9.3 Prototype

- Route: `/design/box-flows` (noindex, simulated data, no wallet writes).
- It implements the catalogue, all shared screens, the Red toggle, White verbatim panel, Black
  Harold result, Rainbow triggered-box line, and error variants.
- It is a review tool, not the production implementation. Production must reuse the catalogue
  config and copy from this document.

### 9.4 Acceptance checklist for implementation review

- [ ] All 15 boxes render from one config; Yellow/Pink absent.
- [ ] Mechanic copy matches §4 exactly.
- [ ] Red toggle updates quote and route.
- [ ] Blue offer accepts/rejects and enforces ±1%.
- [ ] Green eligibility blocks ineligible assets.
- [ ] White verbatim language is character-exact and snapshot-tested.
- [ ] Black requires acknowledgement; result shows USD value on the NFT and in text.
- [ ] Rainbow result names the triggered box.
- [ ] Every flow has configure, review, sign, finality, result, and error states.
- [ ] Finality overlay is non-dismissible and stage-based.
- [ ] Result includes CoinGecko + Dexscreener (when available) + explorer links.
- [ ] Keyboard-only path works for every flow; focus trap and restore verified.
- [ ] Reduced-motion path verified.
- [ ] Mobile 320px and 1440px verified.
- [ ] Paused, cap-reached, and wrong-network states render.
- [ ] Sepolia banner present on every screen.

---

## 10. Open questions / decisions needed

| # | Question | Owner | Default until answered |
|---|----------|-------|------------------------|
| 1 | Yellow and Pink mechanics | CEO | Not designed, not rendered |
| 2 | Phantom Solana execution timing | CTO | Phantom shown as EVM-only |
| 3 | White Box NFT receipt vs no-receipt language | CPO / Legal | Spec language wins; donation result shows charity + no receipt |
| 4 | Russian Flag tax/legal disclosure review | CPO / Legal | Full tax table + acknowledgement |
| 5 | Vibe UNITE gate on Sepolia | CPO | Locked UI, preview only in prototype |
| 6 | Checkered counterparty pool on Sepolia | CTO | Demo matchmaking label; no real match |
| 7 | CoinGatcha placement (arcade vs box) | CPO | Arcade section, separate entry |
| 8 | CoinGecko/Dexscreener ID source | CTO | Search URLs until IDs are available |
| 9 | Localisation scope for launch | CPO | English first, strings externalised |
| 10 | Paused/cap state data source | CTO | Contract reads; static fallback |

---

## 11. Copy deck (status and microcopy)

- `CONNECT WALLET` / `CONNECTING…` / `WRONG NETWORK — SWITCH TO SEPOLIA`
- `SELECT` / `LOCKED — 10,000 UNITE` / `PAUSED` / `CAP REACHED`
- `REVIEW` / `CONFIRM IN WALLET` / `CANCEL`
- `WAITING FOR YOUR WALLET…` / `SIGNATURE CANCELLED. NOTHING WAS SENT.`
- `SUBMITTED` / `ROUTING` / `BRIDGING` / `SWAPPING` / `SETTLING` / `FINALIZED`
- `SWEEPING` / `MINTING NFT` / `POSITION OPEN` / `WAITING FOR COUNTERPARTY`
- `COMPLETE` / `PARTIAL FILL` / `TAKING LONGER THAN USUAL`
- `QUOTE EXPIRES IN {n}s` / `REFRESH QUOTE` / `QUOTE UPDATED`
- `INSUFFICIENT {TOKEN}. YOU HAVE {balance}.`
- `THIS CANNOT BE UNDONE.` / `I understand this is irreversible.`
- `I understand the output is random and cannot be chosen.` (Mystery)
- `I understand a random box will fire and I cannot choose it.` (Rainbow)
- `I understand this donation is anonymous and I will not receive a tax receipt.`
- `I understand this is irreversible and will zero my balances.` (Black)
- `I understand I may receive less value and there are no takebacks.` (Checkered)
- `I understand my funds are locked for 24 hours and profit is taxed.`
- `Your funds are in the route. We are checking.`
- `Transaction reverted. Your deposit was not taken.`

Tone: direct, lowercase-friendly in body copy, uppercase for labels and status. No jokes on
irreversible or error screens; personality belongs in box names and catalogue copy.

---

## 12. Change log

| Date | Change | Author |
|------|--------|--------|
| 2026-10-30 | v1: catalogue, shared state machine, per-box modules, tokens, a11y, handoff checklist, prototype | Product Designer |
| 2026-10-30 | v1.1: CPO-approved changes — Rainbow disclosure (P0), White verbatim panel ≥14px (P0), White result renamed `DONATION COMPLETE`, Diamond one-liner, Chinese localisation, punctuation alignment, final acknowledgement copy | Product Designer |
