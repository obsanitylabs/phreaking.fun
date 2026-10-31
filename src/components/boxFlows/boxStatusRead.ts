import { createPublicClient, formatUnits, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import type { BoxId } from "@/components/design/boxFlows/types";
import { BOX_STATUS_ABI } from "./boxStatusAbi";
import {
  CAP_REACHED_COPY,
  PAUSED_COPY,
  SEPOLIA_CHAIN_ID,
  UNPAUSE_PENDING_PREFIX,
} from "./copy";
import type { CapKind, GateKind } from "./flowState";
import { resolveBoxAddress } from "./sepoliaBoxAddresses";

/** Public Sepolia endpoint. View calls only — never a wallet or a broadcast. */
export const SEPOLIA_READ_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";

export type BoxStatusSource = "contract" | "fallback" | "error";

export interface BoxStatusSnapshot {
  source: BoxStatusSource;
  address: Address | null;
  paused: boolean;
  unpauseReleaseAt: number;
  perTransactionCap: bigint;
  perWalletCap: bigint;
  totalValueAtRiskCap: bigint;
  totalValueAtRisk: bigint;
  walletDeposited: bigint;
  /** Which cap a deposit of depositUsd1e8 would hit. Null when no cap blocks it. */
  blockingCap: CapKind | null;
  note: string;
}

export interface DepositQuote {
  /** USD value of the configured deposit, in the contract's 1e8 units. */
  usd1e8: bigint;
}

const ZERO = BigInt(0);

const ZERO_SNAPSHOT: Omit<BoxStatusSnapshot, "source" | "address" | "note"> = {
  paused: false,
  unpauseReleaseAt: 0,
  perTransactionCap: ZERO,
  perWalletCap: ZERO,
  totalValueAtRiskCap: ZERO,
  totalValueAtRisk: ZERO,
  walletDeposited: ZERO,
  blockingCap: null,
};

export function publicSepoliaClient(rpcUrl = SEPOLIA_READ_RPC) {
  return createPublicClient({
    chain: sepolia,
    transport: http(rpcUrl),
  });
}

/**
 * A cap of 0 means unlimited (Deploy.s.sol). A non-zero cap blocks when the
 * deposit would push usage strictly above it — the same comparison as
 * MysteryBoxBase._checkDepositCaps.
 */
export function blockingCap(input: {
  depositUsd1e8: bigint;
  perTransactionCap: bigint;
  perWalletCap: bigint;
  totalValueAtRiskCap: bigint;
  totalValueAtRisk: bigint;
  walletDeposited: bigint;
}): CapKind | null {
  const deposit = input.depositUsd1e8 < ZERO ? ZERO : input.depositUsd1e8;
  if (input.perTransactionCap !== ZERO && deposit > input.perTransactionCap) return "tx";
  if (
    input.totalValueAtRiskCap !== ZERO &&
    input.totalValueAtRisk + deposit > input.totalValueAtRiskCap
  ) {
    return "var";
  }
  if (input.perWalletCap !== ZERO && input.walletDeposited + deposit > input.perWalletCap) {
    return "wallet";
  }
  return null;
}

export function capReachedCopy(kind: CapKind): string {
  const label = kind === "tx" ? "tx" : kind === "var" ? "VaR" : "wallet";
  return `This box has reached its ${label} cap. Try a smaller amount or another box.`;
}

export function unpausePendingCopy(releaseAtSeconds: number): string {
  const when = new Date(releaseAtSeconds * 1000).toISOString().replace(".000Z", "Z");
  return `${UNPAUSE_PENDING_PREFIX}${when}.`;
}

export function gateFromSnapshot(
  snapshot: Pick<BoxStatusSnapshot, "paused" | "unpauseReleaseAt" | "blockingCap">,
  nowSeconds = Math.floor(Date.now() / 1000),
): { gate: GateKind; capKind: CapKind | null; notice: string | null } {
  if (snapshot.paused) {
    if (snapshot.unpauseReleaseAt > nowSeconds) {
      return {
        gate: "paused",
        capKind: null,
        notice: unpausePendingCopy(snapshot.unpauseReleaseAt),
      };
    }
    return { gate: "paused", capKind: null, notice: PAUSED_COPY };
  }
  if (snapshot.blockingCap) {
    return {
      gate: "cap",
      capKind: snapshot.blockingCap,
      notice: capReachedCopy(snapshot.blockingCap),
    };
  }
  return { gate: "none", capKind: null, notice: null };
}

export function fallbackSnapshot(boxId: BoxId, reason: string): BoxStatusSnapshot {
  return {
    ...ZERO_SNAPSHOT,
    source: "fallback",
    address: resolveBoxAddress(boxId),
    note: reason,
  };
}

export async function readBoxStatus(input: {
  boxId: BoxId;
  account?: Address | null;
  depositUsd1e8?: bigint;
  rpcUrl?: string;
  search?: string;
  client?: {
    multicall: (args: {
      contracts: ReadonlyArray<{
        address: Address;
        abi: typeof BOX_STATUS_ABI;
        functionName: string;
        args?: readonly unknown[];
      }>;
      allowFailure: true;
    }) => Promise<ReadonlyArray<{ status: "success" | "failure"; result?: unknown }>>;
  };
}): Promise<BoxStatusSnapshot> {
  const address = resolveBoxAddress(input.boxId, input.search);
  const deposit = input.depositUsd1e8 ?? ZERO;
  if (!address) {
    return fallbackSnapshot(
      input.boxId,
      "No Sepolia fleet address yet. Pause and cap stay on the static preview until Deploy.s.sol records one.",
    );
  }

  const client = input.client ?? publicSepoliaClient(input.rpcUrl);
  const contracts: Array<{
    address: Address;
    abi: typeof BOX_STATUS_ABI;
    functionName: string;
    args?: readonly unknown[];
  }> = [
    { address, abi: BOX_STATUS_ABI, functionName: "paused" },
    { address, abi: BOX_STATUS_ABI, functionName: "unpauseReleaseAt" },
    { address, abi: BOX_STATUS_ABI, functionName: "perTransactionCap" },
    { address, abi: BOX_STATUS_ABI, functionName: "perWalletCap" },
    { address, abi: BOX_STATUS_ABI, functionName: "totalValueAtRiskCap" },
    { address, abi: BOX_STATUS_ABI, functionName: "totalValueAtRisk" },
  ];
  if (input.account) {
    contracts.push({
      address,
      abi: BOX_STATUS_ABI,
      functionName: "walletDeposited",
      args: [input.account],
    });
  }

  let results: ReadonlyArray<{ status: "success" | "failure"; result?: unknown }>;
  try {
    results = await client.multicall({ contracts, allowFailure: true });
  } catch (error) {
    return {
      ...ZERO_SNAPSHOT,
      source: "error",
      address,
      paused: true,
      note: error instanceof Error ? error.message : "Sepolia read failed",
    };
  }

  const paused = results[0]?.status === "success" ? Boolean(results[0].result) : null;
  if (paused === null) {
    return {
      ...ZERO_SNAPSHOT,
      source: "error",
      address,
      paused: true,
      note: "paused() did not return. Review stays blocked until a MysteryBoxBase answers.",
    };
  }

  const asBig = (index: number) =>
    results[index]?.status === "success" ? BigInt(results[index].result as bigint | number) : ZERO;
  const asNum = (index: number) => Number(asBig(index));

  const snapshot: BoxStatusSnapshot = {
    source: "contract",
    address,
    paused,
    unpauseReleaseAt: asNum(1),
    perTransactionCap: asBig(2),
    perWalletCap: asBig(3),
    totalValueAtRiskCap: asBig(4),
    totalValueAtRisk: asBig(5),
    walletDeposited: input.account ? asBig(6) : ZERO,
    blockingCap: null,
    note: `Read from ${address} on chain ${SEPOLIA_CHAIN_ID}.`,
  };
  snapshot.blockingCap = blockingCap({
    depositUsd1e8: deposit,
    perTransactionCap: snapshot.perTransactionCap,
    perWalletCap: snapshot.perWalletCap,
    totalValueAtRiskCap: snapshot.totalValueAtRiskCap,
    totalValueAtRisk: snapshot.totalValueAtRisk,
    walletDeposited: snapshot.walletDeposited,
  });
  return snapshot;
}

/** Format a 1e8 USD cap for the status line. 0 is the contract's unlimited sentinel. */
export function formatCapUsd(value: bigint): string {
  if (value === ZERO) return "unlimited";
  const whole = formatUnits(value, 8);
  const numeric = Number(whole);
  if (!Number.isFinite(numeric)) return whole;
  return numeric.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function statusLine(snapshot: BoxStatusSnapshot): string {
  if (snapshot.source === "fallback") return snapshot.note;
  if (snapshot.source === "error") return `Contract read failed. ${snapshot.note}`;
  const pause = snapshot.paused ? "paused" : "not paused";
  return `Live Sepolia read: ${pause}. Tx cap ${formatCapUsd(snapshot.perTransactionCap)}. VaR cap ${formatCapUsd(snapshot.totalValueAtRiskCap)}. Wallet cap ${formatCapUsd(snapshot.perWalletCap)}.`;
}

export { CAP_REACHED_COPY };
