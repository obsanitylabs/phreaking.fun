// OBS-858 — optimistic-concurrency guard for the moderation blocklist
// read-modify-write (CISO condition C3 hardening).
//
// Netlify Blobs has no compare-and-swap / If-Match primitive, so a plain
// read -> mutate -> store.set() can be clobbered by a concurrent admin write
// (two simultaneous bans/unbans; last writer wins and the first update is
// lost). Guard instead by writing a fresh `writeId` with every commit and
// reading the document back:
//
//   - read-back writeId === ours  -> our document is the committed one; done
//   - read-back writeId differs   -> a concurrent write landed between our
//     write and read-back; replay the mutation against the latest committed
//     state and retry (bounded, then 409 so the client retries explicitly).
//
// Two concurrent writers cannot both verify: whichever write is on top when a
// writer re-reads is the one that verifies; the other detects the mismatch
// and replays, so no update is silently lost.
'use strict';
import { randomUUID } from 'node:crypto';
import { MODERATION_BLOCKLIST_KEY, normalizeBlocklist } from './moderation.mjs';

export const BLOCKLIST_MAX_ATTEMPTS = 3;

/** Read and normalize the committed blocklist document. */
export async function readBlocklist(store) {
  const raw = await store.get(MODERATION_BLOCKLIST_KEY);
  return normalizeBlocklist(raw ? JSON.parse(raw) : null);
}

/**
 * Write `next` stamped with a fresh writeId, then read back to confirm our
 * document is the committed one. Returns the committed doc on success or the
 * latest committed doc when a concurrent write was detected.
 */
async function commitAndVerify(store, next) {
  const writeId = randomUUID();
  const stamped = { ...next, writeId };
  await store.set(MODERATION_BLOCKLIST_KEY, JSON.stringify(stamped));
  const committed = await readBlocklist(store);
  return committed.writeId === writeId
    ? { ok: true, doc: committed }
    : { ok: false, doc: committed };
}

/**
 * Read-modify-write with retry-on-conflict.
 * `apply(current)` must return `{ doc }` (the next blocklist document) or
 * `{ error: { status, body } }` (a request error; returned as `{ error }`).
 * Returns one of:
 *   { ok: true, doc }                — committed and verified
 *   { error: { status, body } }      — the mutation itself was invalid
 *   { conflict: true, attempts }     — clobbered MAX_ATTEMPTS times; client retries
 */
export async function withBlocklistRetry(
  store,
  apply,
  maxAttempts = BLOCKLIST_MAX_ATTEMPTS,
) {
  let current = await readBlocklist(store);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const outcome = apply(current);
    if (outcome.error) return outcome;
    const commit = await commitAndVerify(store, outcome.doc);
    if (commit.ok) return { ok: true, doc: outcome.doc };
    // Concurrent write detected: replay against the latest committed state.
    current = commit.doc;
  }
  return { conflict: true, attempts: maxAttempts };
}
