import type { NextRequest } from "next/server";
import { loadGovernanceConfig } from "@/lib/governance/runtimeConfig";
import { readGovernanceSnapshot } from "@/lib/governance/safeRead";

/**
 * OBS-374 — runtime governance state.
 *
 * `force-dynamic` + Node runtime: the Safe address and target list are resolved
 * from the runtime store (or server env) at request time, never from the
 * build. The admin set is read on-chain (`Safe.getOwners()`), so injecting an
 * admin is a Safe transaction and requires no rebuild or redeploy.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  const config = await loadGovernanceConfig();

  const snapshot = await readGovernanceSnapshot({
    chainId: config.chainId,
    safeAddress: config.safeAddress,
    targets: config.targets,
    connectedAddress: address,
    requiredQuorum: config.requiredQuorum,
  });

  return Response.json(
    {
      configSource: config.source,
      requiredQuorum: config.requiredQuorum,
      ...snapshot,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
