import type { BoxDefinition } from "@/components/design/boxFlows/types";

export type FlowStep =
  | "configure"
  | "review"
  | "sign"
  | "finality"
  | "result"
  | "error";

export type GateKind = "none" | "paused" | "cap" | "wrong-network" | "locked";

/** Which MysteryBoxBase cap blocked the deposit. Spec §9.1 names these three. */
export type CapKind = "tx" | "var" | "wallet";

export interface AssetRow {
  token: string;
  amount: string;
}

export interface FlowState {
  step: FlowStep;
  rows: AssetRow[];
  toggles: Record<string, string>;
  acknowledged: boolean;
  ackError: boolean;
  gate: GateKind;
  /** Set when gate is "cap". The banner names this cap. */
  capKind: CapKind | null;
  notice: string | null;
  charityMode: "random" | "choose";
  machine: "$1" | "$10" | "$100";
  stageIndex: number;
  signing: boolean;
  /** Spec §6.6: HIDE collapses the overlay to a bar. It does not cancel execution. */
  finalityHidden: boolean;
  /** Blue §4: Review stays blocked until the ±1% offer is accepted. */
  offerAccepted: boolean;
  /** Green §4: an ineligible receipt blocks Review until it is removed. */
  greenEligible: boolean;
  /** Purple §6.3.1: selected NFT ids. Capped at 5. */
  selectedNfts: string[];
  /** Purple altcoin → NFT floor sweep preference. */
  floorSweep: boolean;
  /** Checkered §6.3.1 demo matchmaking. Review stays blocked until matched. */
  matchPhase: "escrow" | "waiting" | "matched";
  matchElapsed: number;
  matchAccepted: boolean;
  /** Spec §5. Simulated quote clock. Editing inputs re-issues it. */
  quoteIssuedAt: number;
  quoteRevision: number;
}

export function defaultToggles(box: BoxDefinition): Record<string, string> {
  const values: Record<string, string> = {};
  box.toggles?.forEach((toggle) => {
    values[toggle.id] = toggle.options[0]?.id ?? "";
  });
  return values;
}

export function initialFlowState(box: BoxDefinition): FlowState {
  return {
    step: "configure",
    rows: [{ token: "ETH", amount: "0.05" }],
    toggles: defaultToggles(box),
    acknowledged: false,
    ackError: false,
    gate: box.status === "locked" ? "locked" : "none",
    capKind: null,
    notice: null,
    charityMode: "random",
    machine: "$10",
    stageIndex: 0,
    signing: false,
    finalityHidden: false,
    offerAccepted: false,
    greenEligible: true,
    selectedNfts: [],
    floorSweep: false,
    matchPhase: "escrow",
    matchElapsed: 0,
    matchAccepted: false,
    quoteIssuedAt: 0,
    quoteRevision: 1,
  };
}

export function stagesFor(box: BoxDefinition, toggles: Record<string, string>): string[] {
  switch (box.flowKind) {
    case "fixed-swap":
      return [
        "SUBMITTED",
        "ROUTING",
        ...(toggles.route === "cross-chain" ? ["BRIDGING"] : []),
        "SWAPPING",
        "FINALIZED",
      ];
    case "donation":
      return ["SUBMITTED", "ROUTING", "SWAPPING TO USDC", "DONATING", "FINALIZED"];
    case "wallet-sweep":
      return ["SUBMITTED", "SWEEPING", "VALUING", "MINTING NFT", "FINALIZED"];
    case "random-box":
      return ["SUBMITTED", "FIRING RANDOM BOX", "ROUTING", "SWAPPING", "FINALIZED"];
    case "portfolio-match":
      return ["SUBMITTED", "ESCROWING", "WAITING FOR COUNTERPARTY", "SETTLING", "FINALIZED"];
    case "leveraged-trade":
      return ["SUBMITTED", "CONVERTING TO USDC", "OPENING GMX POSITION", "POSITION OPEN"];
    case "mirror":
      return [
        "SUBMITTED",
        "ROUTING",
        ...(box.id === "diamond" ? ["TWAP FILL"] : []),
        "SETTLING",
        "FINALIZED",
      ];
    case "gatcha":
      return ["SUBMITTED", "GRABBING", "DELIVERING", "FINALIZED"];
    default:
      return ["SUBMITTED", "ROUTING", "SWAPPING", "SETTLING", "FINALIZED"];
  }
}

export function canAdvanceFromConfigure(
  box: BoxDefinition,
  state: FlowState,
  quoteExpired = false,
): boolean {
  if (quoteExpired) return false;
  if (state.gate === "paused" || state.gate === "cap" || state.gate === "wrong-network") {
    return false;
  }
  if (state.gate === "locked" || box.status === "locked") return false;
  if (box.flowKind === "portfolio-offer" && !state.offerAccepted) return false;
  if (box.flowKind === "recycle" && !state.greenEligible) return false;
  if (box.id === "purple") {
    const mode = state.toggles.mode === "alt-to-nft" ? "alt-to-nft" : "nft-to-alt";
    if (mode === "nft-to-alt") return state.selectedNfts.length > 0;
    return state.rows.some((row) => Number(row.amount) > 0);
  }
  if (box.id === "checkered") return state.matchPhase === "matched" && state.matchAccepted;
  if (box.assetMode === "wallet" || box.assetMode === "none") return true;
  return state.rows.some((row) => Number(row.amount) > 0);
}

/** Demo tx hash. The slice never broadcasts, so the explorer link stays on the Sepolia root. */
export const DEMO_TX_HASH = "0xsepolia-demo-not-broadcast";

export const DEMO_EXPLORER_URL = "https://sepolia.etherscan.io/";

const TOKEN_LINK_SKIP = new Set(["USD SWEPT", "POSITION"]);

export function coingeckoSearchUrl(symbol: string): string {
  return `https://www.coingecko.com/en/search?query=${encodeURIComponent(symbol)}`;
}

export function dexscreenerSearchUrl(symbol: string): string {
  return `https://dexscreener.com/search?q=${encodeURIComponent(symbol)}`;
}

export function resultShowsTokenLinks(box: BoxDefinition): boolean {
  const primary = box.demo.assets[0];
  if (!primary || TOKEN_LINK_SKIP.has(primary.symbol)) return false;
  return Boolean(box.demo.coingecko || box.demo.dexscreener);
}

export function canConfirmReview(
  box: BoxDefinition,
  state: FlowState,
  quoteExpired = false,
): boolean {
  if (quoteExpired) return false;
  if (state.gate !== "none" && state.gate !== "locked") return false;
  if (box.requiresAcknowledgement && !state.acknowledged) return false;
  return true;
}

/** Sepolia slice does not broadcast. Sign is a preview that returns to review. */
export function signBlockedReason(): string {
  return "Sepolia preview only. This screen does not request a signature or send a transaction.";
}
