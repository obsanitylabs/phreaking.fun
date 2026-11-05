# OBS-858 — Moderation admin token + blocklist concurrency

Follow-up to OBS-126 (PR #34, merge `a108160`). Covers the two CISO verdict conditions on the moderation surface.

## 1. `MODERATION_ADMIN_TOKEN` binding + rotation (condition C1)

`/api/moderation` authenticates with `Authorization: Bearer $MODERATION_ADMIN_TOKEN`. Until the env var is bound server-side, the endpoint fails closed with a constant 404 for every request (no moderation UI actions work).

Policy (mirrors the `INSIGHTS_TOKEN` convention):

- High-entropy, fixed-length, **>= 32 characters** (the constant-time compare length-pre-checks against the expected length).
- **Server-side Netlify env var only.** Never `NEXT_PUBLIC_*`; never in source, config, or the client bundle. Value lives only in the company secret store + the Netlify production environment.
- **Rotation <= 90 days**, recorded in the company secret store. Rotating this token is independent of `INSIGHTS_TOKEN` and the waitlist admin/export tokens.
- Revocation = unset/replace the Netlify env var; no other surface is affected.

Capability gap (tracked on OBS-710): binding/rotation requires an authenticated `netlify env:set` by a team member with Netlify access; the CLI in agent runtimes is not logged in, so the binding is an explicit human operator step. Until it is done, `/api/moderation` stays fail-closed (404).

## 2. Blocklist concurrency guard (condition C3, hardening)

Netlify Blobs has no CAS/If-Match primitive, so the ban/unban read-modify-write in `netlify/functions/moderation.mjs` is guarded by `withBlocklistRetry` (`netlify/shared/moderationStore.mjs`):

- Every commit stamps a fresh `writeId` (random UUID) and bumps the document `version`.
- After `store.set`, the document is read back; a `writeId` mismatch means a concurrent admin write landed between our write and the read-back.
- On conflict the mutation is **replayed against the latest committed state** and retried, up to `BLOCKLIST_MAX_ATTEMPTS` (3); then the API returns `409 { error: "conflict", retry: true }`.

Two simultaneous writers cannot both verify; the loser detects the clobber and replays, so no ban/unban is silently lost.

Tests: `npm run test:moderation` (`moderation.test.mjs` + `moderationStore.test.mjs`).
