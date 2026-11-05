/**
 * OBS-374 — access-controlled governance audit store.
 *
 * Records one entry per governance attempt (broadcast, refused, reverted OR
 * confirmed) — see OBS-414 §6 for the schema. This store is deliberately
 * SEPARATE from the analytics/event pipeline: the acting admin wallet address
 * lives here and must never be written to analytics (OBS-126).
 *
 * Storage: Netlify Blobs (distinct store name) in production; a JSON file shim
 * for local/dev. The store is access-controlled at the platform layer; the
 * audit DSN/secret is server-side only. Writes fail closed — callers must treat
 * `ok: false` as a refusal to act.
 */

import fs from "node:fs";
import type { GovernanceAuditRecord } from "./model";

export const AUDIT_STORE_NAME = "admin_governance_audit";
export const AUDIT_LOCAL_PATH =
  process.env.GOVERNANCE_AUDIT_LOCAL_PATH || ".obs-governance-audit.json";

export interface AuditWriteResult {
  ok: boolean;
  reason?: string;
}

interface BlobsStore {
  set: (key: string, value: string) => Promise<void>;
  get: (key: string) => Promise<string | null>;
  list: () => Promise<Iterable<{ key: string }>>;
}

async function getBlobsStore(): Promise<BlobsStore | null> {
  const context = process.env.NETLIFY_BLOBS_CONTEXT;
  if (!context) return null;
  try {
    const specifier = "@netlify/blobs";
    const mod = (await import(/* webpackIgnore: true */ specifier)) as unknown as {
      getStore: (opts: { name: string; context?: string }) => BlobsStore;
    };
    return mod.getStore({ name: AUDIT_STORE_NAME, context });
  } catch {
    return null;
  }
}

function readLocal(): Record<string, GovernanceAuditRecord> {
  try {
    if (!fs.existsSync(AUDIT_LOCAL_PATH)) return {};
    return JSON.parse(fs.readFileSync(AUDIT_LOCAL_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeLocal(data: Record<string, GovernanceAuditRecord>): void {
  const tmp = `${AUDIT_LOCAL_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, AUDIT_LOCAL_PATH);
}

const REQUIRED_FIELDS: ReadonlyArray<keyof GovernanceAuditRecord> = [
  "id",
  "timestamp",
  "chainId",
  "actorWallet",
  "action",
  "targets",
  "safeAddress",
  "safeTxHash",
  "safeNonce",
  "quorumThreshold",
  "quorumOwnerCount",
  "quorumSignatures",
  "quorumState",
  "outcome",
];

export function isValidAuditRecord(record: unknown): record is GovernanceAuditRecord {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return REQUIRED_FIELDS.every((field) => r[field] !== undefined && r[field] !== null);
}

/** Append one audit record. Returns `ok: false` when the store is unavailable. */
export async function appendAuditRecord(
  record: GovernanceAuditRecord,
): Promise<AuditWriteResult> {
  if (!isValidAuditRecord(record)) {
    return { ok: false, reason: "audit record failed schema validation" };
  }
  const key = `${record.timestamp}__${record.id}`;
  try {
    const store = await getBlobsStore();
    if (store) {
      await store.set(key, JSON.stringify(record));
      return { ok: true };
    }
    const data = readLocal();
    data[key] = record;
    writeLocal(data);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "audit store write failed",
    };
  }
}

/** List audit records, newest first. */
export async function listAuditRecords(limit = 100): Promise<GovernanceAuditRecord[]> {
  try {
    const store = await getBlobsStore();
    if (store) {
      const keys: string[] = [];
      for await (const entry of await store.list()) keys.push(entry.key);
      keys.sort().reverse();
      const out: GovernanceAuditRecord[] = [];
      for (const key of keys.slice(0, limit)) {
        const text = await store.get(key);
        if (text) out.push(JSON.parse(text));
      }
      return out;
    }
    const data = readLocal();
    return Object.entries(data)
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, limit)
      .map(([, value]) => value);
  } catch {
    return [];
  }
}
