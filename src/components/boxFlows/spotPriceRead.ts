import { createPublicClient, formatUnits, http, type Address } from "viem";
import { sepolia } from "viem/chains";
import { SEPOLIA_READ_RPC } from "./boxStatusRead";

/**
 * Sepolia Chainlink aggregators. These are view reads of public feeds.
 * They price the deposit line only. They are not a pool quote, a swap route,
 * or a GMX mark.
 *
 * Sources: Chainlink Sepolia price feeds (ETH/USD, LINK/USD, BTC/USD).
 * USDC is the dollar unit and is not read from a feed.
 */
export const SEPOLIA_SPOT_FEEDS = {
  ETH: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  LINK: "0xc59E3633BAAC79493d908e63626716e204A45EdF",
  WBTC: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43",
} as const;

export type SpotSymbol = keyof typeof SEPOLIA_SPOT_FEEDS | "USDC";

export type SpotSource = "chainlink" | "fallback" | "error";

export interface SpotPriceBook {
  source: SpotSource;
  prices: Partial<Record<SpotSymbol, number>>;
  note: string;
}

const AGGREGATOR_ABI = [
  {
    type: "function",
    name: "latestRoundData",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" },
    ],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

/** A feed older than this is not a current quote. Fail closed. */
export const SPOT_MAX_AGE_SECONDS = 60 * 60 * 24;

export function parseChainlinkAnswer(
  answer: bigint,
  decimals: number,
  updatedAt: bigint,
  nowSeconds: number,
): number | null {
  if (answer <= BigInt(0)) return null;
  if (updatedAt <= BigInt(0)) return null;
  const age = nowSeconds - Number(updatedAt);
  if (!Number.isFinite(age) || age < 0 || age > SPOT_MAX_AGE_SECONDS) return null;
  const value = Number(formatUnits(answer, decimals));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export async function readSepoliaSpotPrices(options?: {
  rpcUrl?: string;
  nowSeconds?: number;
  symbols?: Array<keyof typeof SEPOLIA_SPOT_FEEDS>;
}): Promise<SpotPriceBook> {
  const symbols = options?.symbols ?? (Object.keys(SEPOLIA_SPOT_FEEDS) as Array<keyof typeof SEPOLIA_SPOT_FEEDS>);
  const client = createPublicClient({
    chain: sepolia,
    transport: http(options?.rpcUrl ?? SEPOLIA_READ_RPC),
  });
  const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  const prices: Partial<Record<SpotSymbol, number>> = { USDC: 1 };
  const contracts = symbols.flatMap((symbol) => {
    const address = SEPOLIA_SPOT_FEEDS[symbol] as Address;
    return [
      { address, abi: AGGREGATOR_ABI, functionName: "latestRoundData" as const },
      { address, abi: AGGREGATOR_ABI, functionName: "decimals" as const },
    ];
  });

  try {
    const results = await client.multicall({ contracts, allowFailure: true });
    let live = 0;
    symbols.forEach((symbol, index) => {
      const round = results[index * 2];
      const decimals = results[index * 2 + 1];
      if (round?.status !== "success" || decimals?.status !== "success") return;
      const data = round.result as readonly [bigint, bigint, bigint, bigint, bigint];
      const parsed = parseChainlinkAnswer(data[1], Number(decimals.result), data[3], nowSeconds);
      if (parsed === null) return;
      prices[symbol] = parsed;
      live += 1;
    });
    if (live === 0) {
      return {
        source: "error",
        prices: { USDC: 1 },
        note: "Sepolia spot feeds did not answer. Deposit value stays blocked.",
      };
    }
    return {
      source: "chainlink",
      prices,
      note: `Sepolia Chainlink spot · ${live} feed${live === 1 ? "" : "s"}`,
    };
  } catch {
    return {
      source: "error",
      prices: { USDC: 1 },
      note: "Sepolia spot read failed. Deposit value stays blocked.",
    };
  }
}
