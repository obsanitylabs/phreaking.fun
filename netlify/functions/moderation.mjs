// OBS-126 — moderation admin API. GET/POST /api/moderation
//
// Token auth: Authorization: Bearer $MODERATION_ADMIN_TOKEN (server-side env,
// rotated <=90d). Every auth failure is a constant 404 — do not reveal the route.
// Writes go to a dedicated Netlify Blobs store (`moderation`), separate from the
// analytics store so wallet addresses never enter analytics storage.
//
//   GET  -> { updatedAt, entries, audit }
//   POST -> { action: "ban" | "unban", kind, value, reason?, id? }
//
// The collector enforces anonymous_id + ip_prefix entries. Wallet entries are
// maintained for app/contract-level enforcement surfaces; the analytics pipeline
// never receives a wallet address, so there is nothing for it to enforce.
'use strict';
import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';
import {
  MODERATION_STORE_NAME,
  addBlocklistEntry,
  removeBlocklistEntry,
} from '../shared/moderation.mjs';
import { readBlocklist, withBlocklistRetry } from '../shared/moderationStore.mjs';

const CORS = {};
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS };
const notFound = () => new Response(JSON.stringify({ error: 'not-found' }), { status: 404, headers: JSON_HEADERS });
const jsonError = (status, body) => new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

function tokenOk(provided, expected) {
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearer(req) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

// readBlocklist moved to netlify/shared/moderationStore.mjs (OBS-858) so the
// collector-side and retry guard share one normalize+parse path.

async function readAudit(store, limit = 50) {
  const { blobs } = await store.list({ prefix: 'audit/' });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, limit);
  const out = [];
  for (const key of keys) {
    const text = await store.get(key);
    if (text) out.push(JSON.parse(text));
  }
  return out;
}

async function writeAudit(store, record) {
  const key = `audit/${record.timestamp}__${record.id}`;
  await store.set(key, JSON.stringify(record));
}

export default async (req) => {
  const expected = process.env.MODERATION_ADMIN_TOKEN;
  if (!tokenOk(bearer(req), expected)) return notFound();
  const store = getStore(MODERATION_STORE_NAME);

  if (req.method === 'GET') {
    const [blocklist, audit] = await Promise.all([readBlocklist(store), readAudit(store)]);
    return new Response(JSON.stringify({ ...blocklist, audit }), { status: 200, headers: JSON_HEADERS });
  }

  if (req.method !== 'POST') return notFound();

  let body;
  try {
    body = JSON.parse(await req.text());
  } catch {
    return new Response(JSON.stringify({ error: 'bad-json' }), { status: 400, headers: JSON_HEADERS });
  }

  const action = body?.action;
  const now = new Date().toISOString();

  // OBS-858 — the ban/unban read-modify-write is guarded by withBlocklistRetry:
  // each commit is stamped with a fresh writeId and read back; a writeId mismatch
  // means a concurrent admin write landed, and the mutation is replayed against
  // the latest committed state (bounded) so simultaneous bans/unbans cannot clobber.
  const apply = (current) => {
    if (action === 'ban') {
      const { doc, changed } = addBlocklistEntry(current, { kind: body?.kind, value: body?.value, reason: body?.reason }, now);
      if (!changed) return { error: { status: 400, body: { error: 'invalid-entry' } } };
      return { doc };
    }
    if (action === 'unban') {
      const { doc, changed } = removeBlocklistEntry(current, { id: body?.id, kind: body?.kind, value: body?.value }, now);
      if (!changed) return { error: { status: 404, body: { error: 'not-found-entry' } } };
      return { doc };
    }
    return { error: { status: 400, body: { error: 'bad-action' } } };
  };

  const outcome = await withBlocklistRetry(store, apply);
  if (outcome.error) return jsonError(outcome.error.status, outcome.error.body);
  if (outcome.conflict) return jsonError(409, { error: 'conflict', retry: true, attempts: outcome.attempts });
  const result = outcome.doc; // committed + verified by withBlocklistRetry
  const auditAction = action === 'ban' ? 'BAN' : 'UNBAN';

  await writeAudit(store, {
    id: `${auditAction}-${now}-${Math.random().toString(36).slice(2, 10)}`,
    timestamp: now,
    action: auditAction,
    kind: typeof body?.kind === 'string' ? body.kind : null,
    value: typeof body?.value === 'string' ? body.value : null,
    id_removed: action === 'unban' ? body?.id ?? null : null,
    reason: typeof body?.reason === 'string' ? body.reason.slice(0, 280) : null,
    actor: 'moderation-admin-token',
  });

  const audit = await readAudit(store);
  return new Response(JSON.stringify({ ...result, audit }), { status: 200, headers: JSON_HEADERS });
};

export const config = { path: '/api/moderation' };
