/**
 * OBS-374 — on-chain read surface for the pause/freeze governance dashboard.
 *
 * Reads the Gnosis Safe owner set / threshold / nonce and each target
 * contract's guardian role + pause state from a public Sepolia RPC. This is a
 * read-only module: it never signs, never sends and never holds a key. The
 * dashboard never decides the quorum — it reads it from chain and refuses when
 * the read fails (fail closed).
 */

import { createPublicClient, http, keccak256, toBytes, type Address } from "viem";
import { sepolia } from "viem/chains";
import { ACCESS_CONTROL_ABI, PAUSE_ABI, SAFE_ABI } from "./safeAbi";
import {
  deriveAdminSet,
  normalizeAddress,
  type AdminSetState,
} from "./model";

/** `keccak256("GUARDIAN")` — matches `MysteryBoxBase.GUARDIAN_ROLE`. */
export const GUARDIAN_ROLE = keccak256(toBytes("GUARDIAN"));

export const GOVERNANCE_SEPOLIA_RPC =
  process.env.GOVERNANCE_SEPOLIA_RPC_URL ||
  "https://ethereum-sepolia-rpc.publicnode.com";

export interface GovernanceTarget {
  address: string;
  name: string;
}

export interface TargetSnapshot {
  address: string;
  name: string;
  /** Does the Safe actually hold GUARDIAN_ROLE on this target? */
  hasGuardianRole: boolean;
  paused: boolean;
  unpauseReleaseAt: number;
}

export interface GovernanceSnapshot {
  readOk: boolean;
  safeConfigured: boolean;
  chainId: number;
  safeAddress: string | null;
  safeNonce: number;
  adminSet: AdminSetState;
  targets: TargetSnapshot[];
  note: string;
  fetchedAt: string;
}

/** Minimal multicast client shape, injectable for tests. */
export interface MulticallClient {
  multicall: (args: {
    contracts: ReadonlyArray<{
      address: Address;
      abi: readonly unknown[];
      functionName: string;
      args?: readonly unknown[];
    }>;
    allowFailure: true;
  }) => Promise<ReadonlyArray<{ status: "success" | "failure"; result?: unknown }>>;
}

export function publicGovernanceClient(rpcUrl = GOVERNANCE_SEPOLIA_RPC) {
  return createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
}

function targetSnapshot(
  target: GovernanceTarget,
  results: ReadonlyArray<{ status: "success" | "failure"; result?: unknown }>,
): TargetSnapshot {
  const ok = (i: number) => results[i]?.status === "success";
  return {
    address: normalizeAddress(target.address),
    name: target.name,
    hasGuardianRole: ok(0) ? Boolean(results[0].result) : false,
    paused: ok(1) ? Boolean(results[1].result) : false,
    unpauseReleaseAt: ok(2) ? Number(BigInt(results[2].result as bigint | number)) : 0,
  };
}

/**
 * Read the governance snapshot. `readOk: false` means the Safe/RPC was
 * unreadable — every governance action must then be refused (fail closed).
 */
export async function readGovernanceSnapshot(input: {
  chainId: number;
  safeAddress: string | null;
  targets: readonly GovernanceTarget[];
  connectedAddress?: string | null;
  requiredQuorum: number;
  rpcUrl?: string;
  client?: MulticallClient;
}): Promise<GovernanceSnapshot> {
  const fetchedAt = new Date().toISOString();
  const base = {
    chainId: input.chainId,
    safeAddress: input.safeAddress ? normalizeAddress(input.safeAddress) : null,
    fetchedAt,
  };

  if (!input.safeAddress) {
    return {
      ...base,
      readOk: true,
      safeConfigured: false,
      safeNonce: 0,
      adminSet: deriveAdminSet({
        owners: [],
        threshold: 0,
        connectedAddress: input.connectedAddress,
        requiredQuorum: input.requiredQuorum,
      }),
      targets: [],
      note: "No guardian Safe configured. Governance is not staffed.",
    };
  }

  const client = input.client ?? (publicGovernanceClient(input.rpcUrl) as MulticallClient);
  const safeAddress = input.safeAddress as Address;

  let safeResults: ReadonlyArray<{ status: "success" | "failure"; result?: unknown }>;
  try {
    safeResults = await client.multicall({
      allowFailure: true,
      contracts: [
        { address: safeAddress, abi: SAFE_ABI, functionName: "getOwners" },
        { address: safeAddress, abi: SAFE_ABI, functionName: "getThreshold" },
        { address: safeAddress, abi: SAFE_ABI, functionName: "nonce" },
      ],
    });
  } catch {
    return {
      ...base,
      readOk: false,
      safeConfigured: true,
      safeNonce: 0,
      adminSet: deriveAdminSet({
        owners: [],
        threshold: 0,
        connectedAddress: input.connectedAddress,
        requiredQuorum: input.requiredQuorum,
      }),
      targets: [],
      note: "Safe could not be read. Every pause and freeze is refused; state is stale.",
    };
  }

  const ownersOk = safeResults[0]?.status === "success";
  if (!ownersOk) {
    return {
      ...base,
      readOk: false,
      safeConfigured: true,
      safeNonce: 0,
      adminSet: deriveAdminSet({
        owners: [],
        threshold: 0,
        connectedAddress: input.connectedAddress,
        requiredQuorum: input.requiredQuorum,
      }),
      targets: [],
      note: "Safe.getOwners() did not return. Every pause and freeze is refused; state is stale.",
    };
  }

  const owners = (safeResults[0].result as string[]) ?? [];
  const threshold =
    safeResults[1]?.status === "success" ? Number(BigInt(safeResults[1].result as bigint | number)) : 0;
  const nonce =
    safeResults[2]?.status === "success" ? Number(BigInt(safeResults[2].result as bigint | number)) : 0;

  const adminSet = deriveAdminSet({
    owners,
    threshold,
    connectedAddress: input.connectedAddress,
    requiredQuorum: input.requiredQuorum,
  });

  const targets: TargetSnapshot[] = [];
  for (const target of input.targets) {
    let results: ReadonlyArray<{ status: "success" | "failure"; result?: unknown }> = [];
    try {
      results = await client.multicall({
        allowFailure: true,
        contracts: [
          {
            address: target.address as Address,
            abi: ACCESS_CONTROL_ABI,
            functionName: "hasRole",
            args: [GUARDIAN_ROLE, safeAddress],
          },
          { address: target.address as Address, abi: PAUSE_ABI, functionName: "paused" },
          { address: target.address as Address, abi: PAUSE_ABI, functionName: "unpauseReleaseAt" },
        ],
      });
    } catch {
      results = [];
    }
    targets.push(targetSnapshot(target, results));
  }

  return {
    ...base,
    readOk: true,
    safeConfigured: true,
    safeNonce: nonce,
    adminSet,
    targets,
    note: `Read from Safe ${base.safeAddress} on chain ${input.chainId}.`,
  };
}
