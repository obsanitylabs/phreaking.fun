# OBS-125 — First-party analytics (Netlify-native)

Board direction 2026-10-30: existing infra only; each site gets its own dashboard baked in on its own domain, running in the GitHub repo + Netlify instance. Storage is **Netlify Blobs** — Netlify, Inc. is the sole processor (site hosting + storage under its DPA); there is no analytics vendor and no other processor (C9 amended per GC OBS-156). Full compliance delta vs the earlier PostHog-on-VPS design: `docs/COMPLIANCE-DELTA.md`. Board direction (OBS-169, 2026-10-30): analytics are **default-on** — no consent gate, no banner, no notice page. Aggregate product metrics only; no personal information is collected.

## What landed here

| Piece | Path | Purpose |
|---|---|---|
| Collector | `netlify/functions/collect.mjs` → `POST /api/collect` | R1 metric-dictionary allowlist (query-strip, host-only referrer, extras dropped+counted), R3 IP truncation, R6 bot filter (counted, never stored) |
| Dashboard data | `netlify/functions/insights.mjs` → `GET /api/insights` | Bearer-token aggregates: WAU, new users, activation, D1/D7/D30 cohorts, funnels, channel mix, share rate, data-quality counters. 404 on bad token. |
| Retention | `netlify/functions/retention-purge.mjs` | Scheduled daily 03:17 UTC, deletes >90d day-partitions (R4) |
| Dashboard | `public/insights/index.html` → `/insights/` | Token-auth page on this site's own domain; `?peer=https://<sibling>` joins both products for the investor board; Print→PDF weekly export |
| SDK | `public/obs-analytics.js` → `/obs-analytics.js` | First-party default-on SDK (OBS-169): D4 first-touch UTMs, aggregate metrics only, **no consent gate** |
| Acceptance | `verify/verify-e2e.sh` | Wire test against the deployed site |

## Integration state in this repo

- `/obs-analytics.js` loads via `src/app/layout.tsx` before app hydration. Per OBS-169 the SDK is **default-on** — page views and events are sent without any consent gate.
- **Not yet wired (deliberately):** the consent UI toggle (needs GC-approved notice text).
- **Funnel events wired (OBS-354; conformed to metric-dictionary v2.1 §4.4 in OBS-491):** `wallet_connected` (Sepolia only, once per session, on connect + auto-reconnect), `funnel_step pff_purchase` (`box_configured` step 1 / `purchase_confirmed` step 2 — emitted only on a genuine on-chain confirmation, no `purchase_submitted`), `core_action box_opened`, and first-open `activation_complete`. Emitters live in `src/lib/analytics.ts` (all guarded on `window.OBS`); verification: `src/lib/analytics.test.ts` + `node --import tsx scripts/verify-funnel-events.mjs`.
- Required Netlify env (from the company secret store, never committed): `INSIGHTS_TOKEN` (bearer for `/api/insights`); `INSIGHTS_ALLOWED_ORIGIN` only on the site hosting the cross-origin investor board.

## Go-live gates (do not enable tracking before all are true)

1. CISO/GC re-confirmation of the storage delta (`docs/COMPLIANCE-DELTA.md`) — **routed, pending**.
2. GC-approved privacy notice live on the site.
3. `INSIGHTS_TOKEN` set in Netlify site env.
4. Acceptance: `SITE=<domain> PRODUCT=pff TOKEN=<token> bash verify/verify-e2e.sh` + dashboard screenshots filed on OBS-125.

## OBS-303 — campaign funnel (C0–C3) + admin-only on-chain overlay

Read paths (all numbers reproduce from exactly two read APIs — no side tallies, pre-registered on the OBS-297 measurement-plan):

- **C0** `waitlist_verified` (pff) — joined in the dashboard from `GET /api/waitlist/stats?product=pff` (OBS-203 waitlist service; its own Bearer token, second field on `/insights/`).
- **C1–C3** — `GET /api/insights?days=N` now returns `campaignFunnel`: C1 `funnel_step pff_purchase/box_configured`, C2 `activation_complete`, C3 `core_action box_opened ≥2` — all distinct `anonymous_id`, metric-dictionary-v2 events only (no new events/attributes; `box_configured` vocabulary pending CPO sign-off on OBS-307).
- **On-chain overlay** — `GET /api/insights?days=N&onchain=1` adds `onchainOverlay`: pause/cap state per box (`paused`, `unpauseReleaseAt`, per-tx/per-wallet/VaR caps), deposit aggregates from `DepositReceived` logs, and a bounded failed-tx scan (`PFF_FAILED_TX_SCAN_BLOCKS`, default 900, max 3600). Computed live from the Sepolia RPC (`PFF_SEPOLIA_RPC_URL`, fleet via `PFF_BOX_ADDRESSES`), **aggregate-only**: no wallet addresses, tx hashes, emails or raw IPs are returned or persisted, and nothing on-chain is ever written to the analytics store. Undeployed boxes degrade to an explicit `read-failed` — no fabricated state. `revenue`/`fees` are `null` (the prototype contracts are deposit-forward; no on-chain fee accounting exists to read).

Unit tests: `node --test netlify/shared/` (28 tests — funnel definitions, rate formulas, and the overlay aggregation privacy rules).
