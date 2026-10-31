import type { BoxDefinition } from "@/components/design/boxFlows/types";
import {
  CHECKERED_ACCEPT_WINDOW,
  CHECKERED_DEMO_LABEL,
  CHECKERED_WAITING,
  PURPLE_FLOOR_SWEEP,
  PURPLE_MAX_NFTS,
  PURPLE_SIMILAR_VALUE,
  RUSSIAN_ACKNOWLEDGEMENT,
  RUSSIAN_BASKET,
  RUSSIAN_RETURN_NOTE,
  RUSSIAN_SHORT_CHANCE,
  RUSSIAN_TAX_TABLE,
} from "./copy";

export interface DemoNft {
  id: string;
  name: string;
  floorUsd: number;
  floorLabel: string;
}

/** Static Sepolia preview inventory. No wallet NFT read in this slice. */
export const DEMO_NFTS: DemoNft[] = [
  { id: "harold-4821", name: "Hide The Pain Harold #4821", floorUsd: 184, floorLabel: "$184.00" },
  { id: "punks-912", name: "Sepolia Punks #912", floorUsd: 96, floorLabel: "$96.00" },
  { id: "ape-44", name: "Test Ape #44", floorUsd: 61, floorLabel: "$61.00" },
  { id: "mfer-77", name: "MFER #77", floorUsd: 42, floorLabel: "$42.00" },
  { id: "orb-3", name: "Orbital #3", floorUsd: 28, floorLabel: "$28.00" },
  { id: "grid-8", name: "Gridworks #8", floorUsd: 19, floorLabel: "$19.00" },
];

export const DEMO_PORTFOLIO = [
  { symbol: "ETH", amount: "0.420", usd: 1344 },
  { symbol: "USDC", amount: "498.60", usd: 498.6 },
];

export const MATCHED_PORTFOLIO = [
  { symbol: "wTHT", amount: "1,240.00", usd: 1550 },
  { symbol: "USDC", amount: "310.00", usd: 310 },
  { symbol: "GFI", amount: "88.00", usd: 132 },
];

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function nftFloorTotal(ids: string[]): number {
  return DEMO_NFTS.filter((nft) => ids.includes(nft.id)).reduce(
    (sum, nft) => sum + nft.floorUsd,
    0,
  );
}

export function portfolioTotal(
  rows: { usd: number }[] = DEMO_PORTFOLIO,
): number {
  return rows.reduce((sum, row) => sum + row.usd, 0);
}

export function purpleMode(toggles: Record<string, string>): "nft-to-alt" | "alt-to-nft" {
  return toggles.mode === "alt-to-nft" ? "alt-to-nft" : "nft-to-alt";
}

export function toggleNftSelection(current: string[], id: string): string[] {
  if (current.includes(id)) return current.filter((item) => item !== id);
  if (current.length >= PURPLE_MAX_NFTS) return current;
  return [...current, id];
}

export function purpleReviewReceive(mode: "nft-to-alt" | "alt-to-nft", selected: number): string {
  if (mode === "nft-to-alt") {
    return selected === 0
      ? "Altcoins of similar value — select NFTs first"
      : `Altcoins of similar value for ${selected} NFT${selected === 1 ? "" : "s"}`;
  }
  return "NFTs of similar value, with an optional Harold floor sweep";
}

export function checkeredCanReview(phase: "escrow" | "waiting" | "matched"): boolean {
  return phase === "matched";
}

export const MODULE_COPY = {
  purpleSimilar: PURPLE_SIMILAR_VALUE,
  purpleFloor: PURPLE_FLOOR_SWEEP,
  purpleMax: PURPLE_MAX_NFTS,
  checkeredDemo: CHECKERED_DEMO_LABEL,
  checkeredWaiting: CHECKERED_WAITING,
  checkeredAccept: CHECKERED_ACCEPT_WINDOW,
  russianBasket: RUSSIAN_BASKET,
  russianShort: RUSSIAN_SHORT_CHANCE,
  russianTax: RUSSIAN_TAX_TABLE,
  russianAck: RUSSIAN_ACKNOWLEDGEMENT,
  russianReturn: RUSSIAN_RETURN_NOTE,
} as const;

export function moduleApplies(box: BoxDefinition): "purple" | "checkered" | "russian" | null {
  if (box.id === "purple") return "purple";
  if (box.id === "checkered") return "checkered";
  if (box.id === "russian-flag") return "russian";
  return null;
}
