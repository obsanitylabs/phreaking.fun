// OBS-203 — storage layer. Netlify Blobs in production; JSON file shim for local tests.
// Keys: signup:{product}:{emailHash} | rate:{scope}:{window} | outbox:{id}
//       event:{day}:{seq} | accesslog:export:{iso}:{id}
import fs from 'node:fs';

const STORE_NAME = 'waitlist';

function blobsAvailable() {
  return !!(process.env.NETLIFY_BLOBS_CONTEXT || globalThis.__OBS_LOCAL_STORE__);
}

// Local shim: single JSON file, loaded lazily, atomic-ish writes.
function localFile() {
  return process.env.OBS_LOCAL_STORE_PATH || '.obs-waitlist-store.json';
}

function loadLocal() {
  const p = localFile();
  if (!fs.existsSync(p)) fs.writeFileSync(p, '{}');
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveLocal(data) {
  const tmp = localFile() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, localFile());
}

async function getStore(context) {
  const ctx = context || {};
  if (!ctx.blobs && process.env.NETLIFY_BLOBS_URL) {
    const { getStore: mk } = await import('@netlify/blobs');
    ctx.blobs = mk({ name: STORE_NAME, context: process.env.NETLIFY_BLOBS_CONTEXT });
  }
  return ctx;
}

export async function storeGet(context, key) {
  const ctx = await getStore(context);
  if (ctx.blobs) return JSON.parse((await ctx.blobs.get(key)) || 'null');
  return loadLocal()[key] ?? null;
}

export async function storePut(context, key, value) {
  const ctx = await getStore(context);
  if (ctx.blobs) {
    await ctx.blobs.set(key, JSON.stringify(value));
    return;
  }
  const data = loadLocal();
  data[key] = value;
  saveLocal(data);
}

export async function storeDelete(context, key) {
  const ctx = await getStore(context);
  if (ctx.blobs) { await ctx.blobs.delete(key); return; }
  const data = loadLocal();
  delete data[key];
  saveLocal(data);
}

export async function storeList(context, prefix) {
  const ctx = await getStore(context);
  if (ctx.blobs) {
    const out = {};
    for await (const entry of ctx.blobs.list({ prefix })) out[entry.key] = JSON.parse(entry.data ?? 'null');
    return out;
  }
  const data = loadLocal();
  return Object.fromEntries(Object.entries(data).filter(([k]) => k.startsWith(prefix)));
}

// Fixed-window rate counter. scope e.g. `ip:<hash>` or `email:<hash>:<product>`.
// Value carries {n, window_start_ms} so the purge can age keys correctly for ANY
// window size (CISO note: window index alone is not an age).
export async function rateHit(context, scope, limit, windowSeconds) {
  const now = Date.now();
  const win = Math.floor(now / (windowSeconds * 1000));
  const windowStart = win * windowSeconds * 1000;
  const key = `rate:${scope}:${win}:${windowSeconds}`;
  const cur = await storeGet(context, key);
  const n = cur && cur.window_start_ms === windowStart ? cur.n : 0;
  if (n >= limit) return { ok: false, count: n };
  const rec = { n: n + 1, window_start_ms: windowStart, window_seconds: windowSeconds };
  await storePut(context, key, rec);
  return { ok: true, count: rec.n };
}

export async function signupKey(context, product, eHash) {
  return `signup:${product}:${eHash}`;
}

export { STORE_NAME };