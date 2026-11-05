// OBS-125 — Netlify-native collector (same-origin, per-site). Replaces the VPS collector proxy.
// Enforces R1 (allowlist, query-strip, host-only referrer), R3 (IP truncation before
// persistence, log redaction), R6 (bot filter — counted, never stored).
// OBS-169: default-on aggregate collection — no consent gate (R2 consent check removed).
// Storage: Netlify Blobs (same provider as the site — Netlify, Inc. is the sole processor; see
// docs/COMPLIANCE-DELTA.md and public/analytics-notice.html).
// Deployed at POST /api/collect on each site's own domain.
'use strict';
import { getStore } from '@netlify/blobs';
import { validateBatch, truncateIp, redactLogs } from '../shared/enforce.mjs';
import { makeBotFilter } from '../shared/enforce.mjs';
import {
  MODERATION_BLOCKLIST_KEY,
  MODERATION_STORE_NAME,
  filterBlockedEvents,
  isIpBlocked,
  normalizeBlocklist,
} from '../shared/moderation.mjs';

const isBot = makeBotFilter(); // in-process sliding window (per warm instance; demo volume)
const JSON_HEADERS = { 'content-type': 'application/json' };
const NO_STORE = { 'cache-control': 'no-store' };
const MAX_BATCH_EVENTS = 50; // cheap-DoS cap: events past the cap are rejected+counted, never persisted

function dayKey(d = new Date()) { return `events/${d.toISOString().slice(0, 10)}`; }
function qualityKey(d = new Date()) { return `quality/${d.toISOString().slice(0, 10)}`; }

// OBS-126 — moderation blocklist. Anonymous-id and IP-prefix entries are enforced
// here, before validation and persistence. Wallet entries are not relevant to the
// collector (events never contain wallet addresses) and are never stored here.
// A moderation-store read failure fails open for analytics: we do not drop
// legitimate traffic because the admin store was temporarily unavailable.
async function loadBlocklistEntries() {
  try {
    const store = getStore(MODERATION_STORE_NAME);
    const raw = await store.get(MODERATION_BLOCKLIST_KEY);
    if (!raw) return [];
    return normalizeBlocklist(JSON.parse(raw)).entries;
  } catch {
    return [];
  }
}

export default async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'not-found' }), { status: 404, headers: JSON_HEADERS });

  let parsed;
  try { parsed = JSON.parse(await req.text()); } catch { return new Response(JSON.stringify({ error: 'bad-json' }), { status: 400, headers: JSON_HEADERS }); }
  const events = parsed.events;

  // R3 — truncate at the earliest hop; never log or persist the full IP.
  const rawIp = req.headers.get('x-nf-client-connection-ip') || '';
  const ip = truncateIp(rawIp) || null;
  const ua = req.headers.get('user-agent') || '';
  const bot = isBot({ truncatedIp: ip, userAgent: ua }); // UA used transiently, never persisted
  const store = getStore('site-analytics');
  const today = new Date().toISOString().slice(0, 10);

  const bumpQuality = async (delta) => {
    const qk = `quality/${today}`;
    const cur = JSON.parse((await store.get(qk)) || '{}');
    for (const k of Object.keys(delta)) cur[k] = (cur[k] || 0) + delta[k];
    await store.setJSON(qk, cur);
  };

  if (bot.bot) { await bumpQuality({ botFiltered: 1 }); return new Response(JSON.stringify({ ok: true, filtered: true }), { status: 200, headers: { ...JSON_HEADERS, ...NO_STORE } }); }

  const entries = await loadBlocklistEntries();
  if (isIpBlocked(ip, entries)) {
    const blockedCount = Array.isArray(events) ? events.length : 0;
    await bumpQuality({ blocked: blockedCount || 1 });
    return new Response(JSON.stringify({ ok: true, filtered: true, blocked: blockedCount }), { status: 200, headers: { ...JSON_HEADERS, ...NO_STORE } });
  }

  const filtered = filterBlockedEvents(events, entries);
  const overflow = Array.isArray(filtered.kept) ? Math.max(0, filtered.kept.length - MAX_BATCH_EVENTS) : 0;
  const { accepted, stats } = validateBatch(overflow ? filtered.kept.slice(0, MAX_BATCH_EVENTS) : filtered.kept);
  if (overflow) stats.rejected += overflow;
  await bumpQuality({
    accepted: stats.accepted,
    rejected: stats.rejected,
    droppedAttributes: stats.droppedAttributes,
    ...(filtered.blocked ? { blocked: filtered.blocked } : {}),
  });
  if (accepted.length === 0) return new Response(JSON.stringify({ ok: true, accepted: 0, blocked: filtered.blocked || 0 }), { status: 200, headers: { ...JSON_HEADERS, ...NO_STORE } });

  // R1-clean events only are persisted — daily partition, append.
  const ek = `events/${today}`;
  const cur = JSON.parse((await store.get(ek)) || '[]');
  cur.push(...accepted);
  await store.setJSON(ek, cur);
  console.log(redactLogs(`collect: accepted=${stats.accepted} rejected=${stats.rejected} ip=${ip}`));
  return new Response(JSON.stringify({ ok: true, accepted: stats.accepted }), { status: 200, headers: { ...JSON_HEADERS, ...NO_STORE } });
};

export const config = { path: '/api/collect' };