// OBS-303 — admin-only pff on-chain overlay (Sepolia RPC, aggregate-only).
// NEVER in the analytics store (v2 §2.2/§4): wallet addresses, tx hashes, emails and raw IPs
// are neither persisted nor returned — only aggregates (counts, wei sums, pause/cap state).
// Not a client funnel step and never a client event; served only behind the /api/insights
// server-side Bearer gate (INSIGHTS_TOKEN, 404 on bad token).
// Pure aggregation helpers are exported for node --test coverage; the RPC client is injected.
"use strict";

import {
  createPublicClient,
  http,
  parseAbi,
  parseAbiItem,
  decodeEventLog,
  formatUnits,
} from "viem";
import { sepolia } from "viem/chains";

// Sepolia prototype fleet (same addresses the app pins in src/lib/contracts.ts).
// Override with PFF_BOX_ADDRESSES='{"mystery":"0x..","white":"0x.."}'.
const DEFAULT_BOXES = {
  mystery: "0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5",
  blue: "0x5555A156c36DE4734175C5613304B04eD3ffe6Cb",
};

const BOX_VIEWS_ABI = parseAbi([
  "function paused() view returns (bool)",
  "function unpauseReleaseAt() view returns (uint256)",
  "function perTransactionCap() view returns (uint256)",
  "function perWalletCap() view returns (uint256)",
  "function totalValueAtRiskCap() view returns (uint256)",
  "function totalValueAtRisk() view returns (uint256)",
]);
const DEPOSIT_ABI = parseAbi([
  "event DepositReceived(address indexed user, address indexed token, uint256 amount)",
]);
const NATIVE = "0x0000000000000000000000000000000000000000";

export const DEPOSIT_EVENT = parseAbiItem(
  "event DepositReceived(address indexed user, address indexed token, uint256 amount)",
);
export const DEFAULT_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
export const DEFAULT_FAILED_TX_SCAN_BLOCKS = 900; // ~30 min at Sepolia 2s blocks
export const MAX_FAILED_TX_SCAN_BLOCKS = 3600;

export function resolveBoxes(env) {
  const raw = (env && env.PFF_BOX_ADDRESSES) || "";
  if (!raw) return DEFAULT_BOXES;
  const parsed = JSON.parse(raw);
  const out = {};
  for (const [k, v] of Object.entries(parsed))
    if (/^0x[0-9a-fA-F]{40}$/.test(String(v))) out[k] = String(v);
  return out;
}

// Aggregate DepositReceived logs into per-box counts + volumes (native vs erc20).
// Output never carries user/token addresses or tx hashes.
export function aggregateDeposits(logs) {
  const out = {};
  for (const log of logs || []) {
    let d;
    try {
      d = decodeEventLog({
        abi: DEPOSIT_ABI,
        data: log.data,
        topics: log.topics,
      });
    } catch {
      continue;
    }
    if (!d || d.eventName !== "DepositReceived") continue;
    const box = (log.address || "").toLowerCase();
    const b = (out[box] ||= {
      count: 0,
      nativeWei: 0n,
      erc20Count: 0,
      erc20Amounts: {},
    });
    b.count += 1;
    if (d.args.token.toLowerCase() === NATIVE) {
      b.nativeWei += d.args.amount;
    } else {
      b.erc20Count += 1;
      const t = d.args.token.toLowerCase();
      b.erc20Amounts[t] = (b.erc20Amounts[t] || 0n) + d.args.amount;
    }
  }
  // collapse token map into count+sum only (no addresses)
  return Object.fromEntries(
    Object.entries(out).map(([box, b]) => {
      const erc20 = Object.entries(b.erc20Amounts);
      return [
        box,
        {
          count: b.count,
          native: formatUnits(b.nativeWei, 18),
          erc20Transfers: b.erc20Count,
          erc20TotalAmountRaw: erc20.length
            ? erc20.reduce((a, [, n]) => a + n, 0n).toString()
            : null,
        },
      ];
    }),
  );
}

// Receipts of txs targeting the box addresses → failed-tx rate. null when the
// scan window is too small to be meaningful (never fabricate a rate).
export function failedTxRate({ attempted, failed }) {
  if (!attempted)
    return {
      rate: null,
      note: "no transactions to box contracts in scan window",
    };
  return { rate: +(failed / attempted).toFixed(3), attempted, failed };
}

export function makeClient(env) {
  const rpc = ((env && env.PFF_SEPOLIA_RPC_URL) || DEFAULT_RPC).trim();
  return createPublicClient({
    chain: sepolia,
    transport: http(rpc, { batch: true }),
  });
}

// All RPC reads for the overlay. `client` is injected (viem public client or test stub).
export async function onchainOverlay(
  client,
  { boxes, days = 30, scanBlocks = DEFAULT_FAILED_TX_SCAN_BLOCKS },
) {
  scanBlocks = Math.min(Math.max(scanBlocks | 0, 0), MAX_FAILED_TX_SCAN_BLOCKS);
  const addresses = Object.values(boxes);

  const pauseState = {};
  for (const [name, addr] of Object.entries(boxes)) {
    // Per-box degrade: an undeployed/undecodable box reports an explicit error
    // instead of failing the whole overlay (never fabricate its state).
    try {
      const [paused, unpauseReleaseAt, perTx, perWallet, varCap, varNow] =
        await Promise.all([
          client.readContract({
            address: addr,
            abi: BOX_VIEWS_ABI,
            functionName: "paused",
          }),
          client.readContract({
            address: addr,
            abi: BOX_VIEWS_ABI,
            functionName: "unpauseReleaseAt",
          }),
          client.readContract({
            address: addr,
            abi: BOX_VIEWS_ABI,
            functionName: "perTransactionCap",
          }),
          client.readContract({
            address: addr,
            abi: BOX_VIEWS_ABI,
            functionName: "perWalletCap",
          }),
          client.readContract({
            address: addr,
            abi: BOX_VIEWS_ABI,
            functionName: "totalValueAtRiskCap",
          }),
          client.readContract({
            address: addr,
            abi: BOX_VIEWS_ABI,
            functionName: "totalValueAtRisk",
          }),
        ]);
      pauseState[name] = {
        paused,
        unpauseReleaseAt: unpauseReleaseAt.toString(),
        caps: {
          perTransactionCapEth: formatUnits(perTx, 18),
          perWalletCapEth: formatUnits(perWallet, 18),
          totalValueAtRiskCapEth: formatUnits(varCap, 18),
        },
        totalValueAtRiskEth: formatUnits(varNow, 18),
      };
    } catch (e) {
      pauseState[name] = {
        error: "read-failed",
        message: String((e && e.shortMessage) || e.message || e),
      };
    }
  }

  // DepositReceived logs over the requested window (blocks-per-day estimated at 12s —
  // Sepolia is faster, so this range always covers `days`; getLogs is filtered by address+topic).
  const latest = Number(await client.getBlockNumber());
  const from = Math.max(0, latest - Math.ceil((days * 86400) / 12));
  const logs = [];
  for (const addr of addresses) {
    logs.push(
      ...(await client.getLogs({
        address: addr,
        event: DEPOSIT_EVENT,
        fromBlock: BigInt(from),
        toBlock: "latest",
      })),
    );
  }
  const deposits = aggregateDeposits(logs);

  // Failed-tx rate: bounded trailing scan of full blocks for txs targeting the boxes.
  let attempted = 0;
  let failed = 0;
  if (scanBlocks > 0) {
    const start = Math.max(0, latest - scanBlocks);
    for (let n = start; n <= latest; n++) {
      const block = await client.getBlock({
        blockNumber: BigInt(n),
        includeTransactions: true,
      });
      for (const tx of block.transactions) {
        const to = (tx.to || "").toLowerCase();
        if (!addresses.some((a) => a.toLowerCase() === to)) continue;
        attempted += 1;
        const r = await client.getTransactionReceipt({ hash: tx.hash });
        if (r.status === "reverted") failed += 1;
      }
    }
  }

  return {
    source: "sepolia-rpc",
    windowDays: days,
    failedTxScanBlocks: scanBlocks,
    anyPaused: Object.values(pauseState).some((s) => s.paused),
    pauseState,
    deposits,
    failedTx: failedTxRate({ attempted, failed }),
    // No fee/revenue accounting exists in the Sepolia prototype contracts (deposit-forward
    // design, per OBS-129/OBS-184 remediation): reported as null rather than derived.
    revenue: null,
    feesNote:
      "prototype contracts are deposit-forward; no on-chain fee/revenue accounting to report",
    transfers: null,
    transfersNote:
      "no collection-transfer events in the Sepolia prototype fleet; reported when the indexer emits them",
  };
}
