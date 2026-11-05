// OBS-126 — moderation blocklist: pure matching + validation.
//
// The admin dashboard maintains a blocklist for three kinds of entries:
//   - anonymous_id  (analytics UUID — the only user identifier the collector sees)
//   - ip_prefix     (truncated network prefix; the collector only ever sees /24 or /48)
//   - wallet        (wallet address; stored for app/contract-level use, never written
//                    to the analytics/event store — wallet addresses must never land there)
//
// The collector enforces anonymous_id and ip_prefix by dropping matching events
// before they are validated or persisted. Wallet entries are returned by the admin
// API so a wallet-aware surface can enforce them; the analytics pipeline never sees
// a wallet address in the first place.
//
// Storage lives in a dedicated Netlify Blobs store (`moderation`), separate from
// `site-analytics`, so the "no wallet addresses in analytics storage" rule holds.
'use strict';

export const MODERATION_STORE_NAME = 'moderation';
export const MODERATION_BLOCKLIST_KEY = 'blocklist';

export const ENTRY_KINDS = /** @type {const} */ (['anonymous_id', 'ip_prefix', 'wallet']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const WALLET_RE = /^0[xX][0-9a-fA-F]{40}$/;
const IPV4_PREFIX_RE = /^(\d{1,3})\.(\d{1,3})(?:\.(\d{1,3}))?(?:\.(\d{1,3}))?$/;
const IPV6_PREFIX_RE = /^[0-9a-fA-F:]{2,39}$/;

export function normalizeKind(kind) {
  return typeof kind === 'string' && ENTRY_KINDS.includes(kind) ? kind : null;
}

/**
 * Normalize an IP prefix to the /24-shaped value the collector can match.
 * IPv4: keep 2-4 octets; a 3-octet value is treated as a /24 and given `.0`.
 * IPv6: keep the first three hextets as a colon-separated prefix.
 * Returns null when the value cannot be a valid network prefix.
 */
export function normalizeIpPrefix(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  if (s.includes(':')) {
    const hextets = s.replace(/^::ffff:/, '').split(':').filter(Boolean).slice(0, 3);
    if (hextets.length < 2) return null;
    if (!hextets.every((h) => /^[0-9a-fA-F]{1,4}$/.test(h))) return null;
    return hextets.map((h) => h.toLowerCase()).join(':');
  }
  const m = s.match(IPV4_PREFIX_RE);
  if (!m) return null;
  const octets = [m[1], m[2], m[3], m[4]].filter((o) => o !== undefined);
  if (octets.length < 2) return null;
  if (octets.some((o) => Number(o) > 255)) return null;
  if (octets.length === 3) octets.push('0');
  return octets.join('.');
}

export function normalizeEntryValue(kind, value) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (kind === 'anonymous_id') return UUID_RE.test(v) ? v.toLowerCase() : null;
  if (kind === 'wallet') return WALLET_RE.test(v) ? v.toLowerCase() : null;
  if (kind === 'ip_prefix') return normalizeIpPrefix(v);
  return null;
}

/** Validate a single blocklist entry. Returns a normalized entry or null. */
export function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const kind = normalizeKind(entry.kind);
  if (!kind) return null;
  const value = normalizeEntryValue(kind, entry.value);
  if (!value) return null;
  return {
    id: typeof entry.id === 'string' && entry.id ? entry.id : `${kind}:${value}`,
    kind,
    value,
    reason: typeof entry.reason === 'string' ? entry.reason.slice(0, 280) : '',
    createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : new Date().toISOString(),
    createdBy: typeof entry.createdBy === 'string' ? entry.createdBy : 'admin',
  };
}

/** Normalize an arbitrary blocklist document; invalid entries are dropped. */
export function normalizeBlocklist(raw) {
  const entries = Array.isArray(raw?.entries) ? raw.entries : [];
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const n = normalizeEntry(entry);
    if (!n || seen.has(n.id)) continue;
    seen.add(n.id);
    out.push(n);
  }
  // `version`/`writeId` are the OBS-858 optimistic-concurrency fields: version
  // monotonically increases per blocklist write; writeId identifies the exact
  // committed document so a clobbered read-modify-write is detected on re-read.
  return {
    updatedAt: typeof raw?.updatedAt === 'string' ? raw.updatedAt : null,
    version: Number.isSafeInteger(raw?.version) && raw.version >= 0 ? raw.version : 0,
    writeId: typeof raw?.writeId === 'string' && raw.writeId ? raw.writeId : null,
    entries: out,
  };
}

function ipv4Blocked(truncatedIp, prefix) {
  const t = truncatedIp.split('.');
  const p = prefix.split('.');
  if (p.length < 2 || t.length < p.length) return false;
  return p.every((octet, i) => octet === t[i]);
}

function ipv6Blocked(truncatedIp, prefix) {
  const t = truncatedIp.toLowerCase().split(':');
  const p = prefix.toLowerCase().split(':');
  if (p.length < 2 || t.length < p.length) return false;
  return p.every((hextet, i) => hextet === t[i]);
}

export function isIpBlocked(truncatedIp, entries) {
  if (typeof truncatedIp !== 'string' || !truncatedIp) return false;
  for (const entry of entries) {
    if (entry.kind !== 'ip_prefix') continue;
    if (truncatedIp.includes(':') !== entry.value.includes(':')) continue;
    if (truncatedIp.includes(':')) {
      if (ipv6Blocked(truncatedIp, entry.value)) return true;
    } else if (ipv4Blocked(truncatedIp, entry.value)) {
      return true;
    }
  }
  return false;
}

export function isAnonymousIdBlocked(anonymousId, entries) {
  if (typeof anonymousId !== 'string' || !anonymousId) return false;
  const id = anonymousId.toLowerCase();
  return entries.some((e) => e.kind === 'anonymous_id' && e.value === id);
}

/**
 * Drop events whose anonymous_id is blocked. Callers handle the IP-prefix case
 * once per request (the truncated IP is request-scoped, not per-event).
 */
export function filterBlockedEvents(events, entries) {
  const list = Array.isArray(events) ? events : [];
  if (!entries || entries.length === 0) return { kept: list, blocked: 0 };
  const kept = [];
  let blocked = 0;
  for (const ev of list) {
    const id = ev && typeof ev === 'object' ? ev.anonymous_id : null;
    if (isAnonymousIdBlocked(id, entries)) {
      blocked++;
      continue;
    }
    kept.push(ev);
  }
  return { kept, blocked };
}

/** Add or replace an entry by kind+value. Returns a new normalized document. */
export function addBlocklistEntry(raw, entry, now = new Date().toISOString()) {
  const doc = normalizeBlocklist(raw);
  const n = normalizeEntry(entry);
  if (!n) return { doc, changed: false };
  const without = doc.entries.filter(
    (e) => !(e.kind === n.kind && e.value === n.value),
  );
  without.push({ ...n, createdAt: now });
  return { doc: { ...doc, updatedAt: now, version: (doc.version ?? 0) + 1, entries: without }, changed: true };
}

/** Remove an entry by id or by kind+value. Returns a new normalized document. */
export function removeBlocklistEntry(raw, { id, kind, value }, now = new Date().toISOString()) {
  const doc = normalizeBlocklist(raw);
  const before = doc.entries.length;
  const entries = doc.entries.filter((e) => {
    if (id) return e.id !== id;
    const k = normalizeKind(kind);
    const v = k ? normalizeEntryValue(k, value) : null;
    if (!k || !v) return true;
    return !(e.kind === k && e.value === v);
  });
  const changed = entries.length !== before;
  // OBS-858: bump version so every commit is distinguishable (see moderationStore.mjs).
  return { doc: changed ? { ...doc, updatedAt: now, version: (doc.version ?? 0) + 1, entries } : doc, changed };
}
