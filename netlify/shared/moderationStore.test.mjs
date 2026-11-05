// OBS-858 — moderation blocklist optimistic-concurrency guard tests (node:test).
// Uses a fake Blobs store; no @netlify/blobs dependency needed here.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addBlocklistEntry } from './moderation.mjs';
import {
  BLOCKLIST_MAX_ATTEMPTS,
  readBlocklist,
  withBlocklistRetry,
} from './moderationStore.mjs';

const ID = '3f2a1c9e-4b7d-4e2a-9c1f-2a6b8d0e5f13';
const WALLET = '0x' + 'ab'.repeat(20);

/** In-memory store; `clobbers` simulates a concurrent admin write landing
 * between our store.set() and our read-back (the exact race being guarded). */
class FakeStore {
  constructor(doc, clobbers = 0) {
    this.doc = doc === null ? null : JSON.stringify(doc);
    this.clobbers = clobbers;
  }
  async get() {
    return this.doc;
  }
  async set(_key, value) {
    this.doc = value;
    if (this.clobbers > 0) {
      this.clobbers--;
      // concurrent writer commits its own writeId over ours (same version bump)
      const clobbered = JSON.parse(value);
      clobbered.writeId = 'concurrent-writer';
      this.doc = JSON.stringify(clobbered);
    }
  }
}

const banWallet = (current) => {
  const r = addBlocklistEntry(current, { kind: 'wallet', value: WALLET });
  return r.changed
    ? { doc: r.doc }
    : { error: { status: 400, body: { error: 'invalid-entry' } } };
};

test('readBlocklist: empty store normalizes to version 0', async () => {
  const doc = await readBlocklist(new FakeStore(null));
  assert.equal(doc.version, 0);
  assert.equal(doc.entries.length, 0);
});

test('withBlocklistRetry: commits and verifies when uncontended', async () => {
  const store = new FakeStore(null);
  const outcome = await withBlocklistRetry(store, banWallet);
  assert.equal(outcome.ok, true);
  const committed = JSON.parse(store.doc);
  assert.equal(committed.version, 1);
  assert.equal(committed.entries.length, 1);
  assert.equal(committed.entries[0].value, WALLET);
  assert.notEqual(committed.writeId, 'concurrent-writer');
});

test('withBlocklistRetry: detects a clobbered write and replays against the latest state', async () => {
  const base = addBlocklistEntry(null, { kind: 'anonymous_id', value: ID }).doc;
  const store = new FakeStore(base, 1); // one concurrent write clobbers attempt 1
  const outcome = await withBlocklistRetry(store, banWallet);
  assert.equal(outcome.ok, true);
  const committed = JSON.parse(store.doc);
  // our ban replayed on top of the concurrent writer's document: nothing lost
  assert.equal(committed.version, 3);
  assert.equal(committed.entries.length, 2);
  assert.ok(committed.entries.some((e) => e.value === ID));
  assert.ok(committed.entries.some((e) => e.value === WALLET));
});

test('withBlocklistRetry: bounded retries then 409-style conflict result', async () => {
  const store = new FakeStore(null, Infinity);
  const outcome = await withBlocklistRetry(store, banWallet);
  assert.equal(outcome.conflict, true);
  assert.equal(outcome.attempts, BLOCKLIST_MAX_ATTEMPTS);
});

test('withBlocklistRetry: mutation errors pass through unchanged', async () => {
  const store = new FakeStore(null);
  const outcome = await withBlocklistRetry(store, () => ({
    error: { status: 400, body: { error: 'invalid-entry' } },
  }));
  assert.deepEqual(outcome, {
    error: { status: 400, body: { error: 'invalid-entry' } },
  });
});
