// OBS-126 — moderation blocklist unit tests (node:test).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addBlocklistEntry,
  filterBlockedEvents,
  isAnonymousIdBlocked,
  isIpBlocked,
  normalizeBlocklist,
  normalizeIpPrefix,
  removeBlocklistEntry,
} from './moderation.mjs';

const ID = '3f2a1c9e-4b7d-4e2a-9c1f-2a6b8d0e5f13';
const WALLET = '0x' + 'ab'.repeat(20);

test('normalizeIpPrefix: IPv4 3-octet becomes a /24, 2-octet stays a /16', () => {
  assert.equal(normalizeIpPrefix('203.0.113'), '203.0.113.0');
  assert.equal(normalizeIpPrefix('203.0.113.0'), '203.0.113.0');
  assert.equal(normalizeIpPrefix('203.0'), '203.0');
  assert.equal(normalizeIpPrefix('203.0.113.77'), '203.0.113.77');
  assert.equal(normalizeIpPrefix('999.0.0.1'), null);
  assert.equal(normalizeIpPrefix('not-an-ip'), null);
});

test('normalizeIpPrefix: IPv6 keeps the first three hextets', () => {
  assert.equal(normalizeIpPrefix('2001:db8:1:2::5'), '2001:db8:1');
  assert.equal(normalizeIpPrefix('::ffff:2001:db8:1:2'), '2001:db8:1');
});

test('isIpBlocked: /24 and /16 prefixes match the truncated collector IP', () => {
  const entries = normalizeBlocklist({
    entries: [
      { kind: 'ip_prefix', value: '203.0.113.0' },
      { kind: 'ip_prefix', value: '198.51' },
    ],
  }).entries;
  assert.equal(isIpBlocked('203.0.113.0', entries), true);
  assert.equal(isIpBlocked('198.51.100.0', entries), true);
  assert.equal(isIpBlocked('203.0.114.0', entries), false);
  assert.equal(isIpBlocked(null, entries), false);
});

test('isAnonymousIdBlocked: exact UUID match only', () => {
  const entries = normalizeBlocklist({ entries: [{ kind: 'anonymous_id', value: ID }] }).entries;
  assert.equal(isAnonymousIdBlocked(ID, entries), true);
  assert.equal(isAnonymousIdBlocked(ID.toUpperCase(), entries), true);
  assert.equal(isAnonymousIdBlocked('00000000-0000-0000-0000-000000000000', entries), false);
});

test('filterBlockedEvents: drops blocked ids and keeps the rest', () => {
  const entries = normalizeBlocklist({ entries: [{ kind: 'anonymous_id', value: ID }] }).entries;
  const { kept, blocked } = filterBlockedEvents(
    [{ anonymous_id: ID }, { anonymous_id: '00000000-0000-0000-0000-000000000000' }],
    entries,
  );
  assert.equal(blocked, 1);
  assert.equal(kept.length, 1);
});

test('addBlocklistEntry: invalid entries are rejected, valid ones replace by kind+value', () => {
  const first = addBlocklistEntry(null, { kind: 'wallet', value: WALLET, reason: 'spam' });
  assert.equal(first.changed, true);
  assert.equal(first.doc.entries.length, 1);
  const second = addBlocklistEntry(first.doc, { kind: 'wallet', value: WALLET.toUpperCase(), reason: 'updated' });
  assert.equal(second.changed, true);
  assert.equal(second.doc.entries.length, 1);
  assert.equal(second.doc.entries[0].reason, 'updated');
  const bad = addBlocklistEntry(first.doc, { kind: 'wallet', value: 'not-a-wallet' });
  assert.equal(bad.changed, false);
});

test('removeBlocklistEntry: removes by id or kind+value', () => {
  const { doc } = addBlocklistEntry(null, { kind: 'anonymous_id', value: ID });
  assert.equal(removeBlocklistEntry(doc, { kind: 'anonymous_id', value: ID }).changed, true);
  assert.equal(removeBlocklistEntry(doc, { id: doc.entries[0].id }).changed, true);
  assert.equal(removeBlocklistEntry(doc, { kind: 'anonymous_id', value: 'x' }).changed, false);
});

test('OBS-858: version bumps per write; normalizeBlocklist preserves version/writeId', () => {
  const first = addBlocklistEntry(null, { kind: 'wallet', value: WALLET });
  assert.equal(first.doc.version, 1);
  const second = addBlocklistEntry(first.doc, { kind: 'anonymous_id', value: ID });
  assert.equal(second.doc.version, 2);
  const removed = removeBlocklistEntry(second.doc, { kind: 'wallet', value: WALLET });
  assert.equal(removed.doc.version, 3);
  assert.equal(removed.doc.entries.length, 1);
  // round-trip through storage keeps the concurrency fields
  const round = normalizeBlocklist(JSON.parse(JSON.stringify(removed.doc)));
  assert.equal(round.version, 3);
  assert.equal(round.writeId, removed.doc.writeId);
  // absent/invalid values fall back safely
  assert.equal(normalizeBlocklist({ entries: [], version: 'x' }).version, 0);
  assert.equal(normalizeBlocklist(null).version, 0);
  assert.equal(normalizeBlocklist(null).writeId, null);
});
