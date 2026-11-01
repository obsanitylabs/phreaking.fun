import type { NextRequest } from "next/server";
import { loadGovernanceConfig } from "@/lib/governance/runtimeConfig";
import { readGovernanceSnapshot } from "@/lib/governance/safeRead";
import {
  appendAuditRecord,
  isValidAuditRecord,
  listAuditRecords,
} from "@/lib/governance/auditStore";
import type { GovernanceAuditRecord } from "@/lib/governance/model";

/**
 * OBS-374 — governance audit log API.
 *
 * This is a SEPARATE, access-controlled store (`admin_governance_audit`),
 * never the analytics/event pipeline (OBS-126). Access is gated by on-chain
 * admin membership: the caller must be a current Safe owner. The store itself
 * is additionally access-controlled at the platform layer; the audit DSN lives
 * server-side only.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function isCurrentOwner(address: string | null): Promise<boolean> {
  if (!address) return false;
  const config = await loadGovernanceConfig();
  if (!config.safeAddress) return false;
  const snapshot = await readGovernanceSnapshot({
    chainId: config.chainId,
    safeAddress: config.safeAddress,
    targets: [],
    connectedAddress: address,
    requiredQuorum: config.requiredQuorum,
  });
  return snapshot.readOk && snapshot.adminSet.isOwner;
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!(await isCurrentOwner(address))) {
    return Response.json({ error: "admin access required" }, { status: 403 });
  }
  const records = await listAuditRecords(200);
  return Response.json({ records }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const record = (body as { record?: unknown })?.record;
  if (!isValidAuditRecord(record)) {
    return Response.json({ error: "invalid audit record" }, { status: 400 });
  }
  const acting = (record as GovernanceAuditRecord).actorWallet;
  if (!(await isCurrentOwner(acting))) {
    return Response.json({ error: "admin access required" }, { status: 403 });
  }
  const result = await appendAuditRecord(record as GovernanceAuditRecord);
  if (!result.ok) {
    // Fail closed: the caller must not broadcast when the audit write fails.
    return Response.json({ error: result.reason ?? "audit write failed" }, { status: 503 });
  }
  return Response.json({ ok: true });
}
