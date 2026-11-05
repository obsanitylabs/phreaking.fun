import type { NextRequest } from "next/server";
import {
  DEFAULT_REQUIRED_QUORUM,
  SEPOLIA_CHAIN_ID,
} from "@/lib/governance/model";
import { loadGovernanceConfig } from "@/lib/governance/runtimeConfig";
import {
  readGovernanceSnapshot,
  unreadableSnapshot,
  type GovernanceSnapshot,
} from "@/lib/governance/safeRead";

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

/** Total budget for config + on-chain read. Netlify kills the function at 30s. */
const GOVERNANCE_STATE_BUDGET_MS = 12_000;
const CONFIG_BUDGET_MS = 4_000;

async function withBudget<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise.catch(() => null),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");

  const config = await withBudget(loadGovernanceConfig(), CONFIG_BUDGET_MS);
  if (!config) {
    const snapshot = unreadableSnapshot(
      {
        chainId: SEPOLIA_CHAIN_ID,
        safeAddress: null,
        connectedAddress: address,
        requiredQuorum: DEFAULT_REQUIRED_QUORUM,
      },
      "Governance configuration read timed out. Failing closed.",
    );
    return Response.json(
      {
        configSource: "unset",
        requiredQuorum: DEFAULT_REQUIRED_QUORUM,
        ...snapshot,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const remaining = Math.max(1_000, GOVERNANCE_STATE_BUDGET_MS - CONFIG_BUDGET_MS);
  const read = readGovernanceSnapshot({
    chainId: config.chainId,
    safeAddress: config.safeAddress,
    targets: config.targets,
    connectedAddress: address,
    requiredQuorum: config.requiredQuorum,
  });
  const snapshot: GovernanceSnapshot | null = await withBudget(read, remaining);

  const result =
    snapshot ??
    unreadableSnapshot(
      {
        chainId: config.chainId,
        safeAddress: config.safeAddress,
        connectedAddress: address,
        requiredQuorum: config.requiredQuorum,
      },
      `Governance read exceeded ${remaining}ms. Failing closed; every pause and freeze is refused.`,
    );

  return Response.json(
    {
      configSource: config.source,
      requiredQuorum: config.requiredQuorum,
      ...result,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
