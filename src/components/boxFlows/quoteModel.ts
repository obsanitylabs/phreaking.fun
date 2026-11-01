import type { BoxDefinition } from "@/components/design/boxFlows/types";
import type { FlowState } from "./flowState";
import { nftFloorTotal, portfolioTotal, purpleMode } from "./moduleModel";

/** Spec §5. A quote lasts 60 seconds. The warning appears in the last 30. */
export const QUOTE_TTL_SECONDS = 60;
export const QUOTE_WARNING_SECONDS = 30;

import {
  QUOTE_EXPIRED_COPY,
  QUOTE_EXPIRES_SOON,
  REFRESH_QUOTE_LABEL,
} from "./copy";

export { QUOTE_EXPIRED_COPY, QUOTE_EXPIRES_SOON, REFRESH_QUOTE_LABEL };

export const QUOTE_UPDATED = "Quote updated";
export const QUOTE_DEMO_LABEL = "Simulated route — no counterparty pool or GMX position.";
export const SPOT_LIVE_LABEL = "Deposit value uses a Sepolia Chainlink spot read.";
export const SPOT_BLOCKED_LABEL = "Sepolia spot read failed. Refresh quote to try again.";
export const OUTPUT_VALUE_LABEL =
  "Output value uses the same Sepolia Chainlink spot read. It is not a pool quote.";
export const OUTPUT_VALUE_BLOCKED = "Output value needs a Sepolia spot read.";
export const OFFER_BAND_LABEL =
  "Offer value uses the same Sepolia Chainlink spot read. It is not a pool fill.";
export const OFFER_OUTSIDE_BAND = "Offer refreshed — review the new value.";

export const NETWORK_FEE_LINE = "0.0012 ETH + 5% premium, charged in the native gas token";
export const PLATFORM_FEE_LINE = "5% of output (shown in the output token)";
export const GATCHA_FEE_LINE = "3% markup + 10% gas premium";

/** Last-resort display prices. A live book replaces these. They never unlock Review. */
export const FALLBACK_TOKEN_PRICES: Record<string, number> = {
  ETH: 3200,
  USDC: 1,
  LINK: 14,
  WBTC: 63120,
};

export interface SimulatedQuote {
  revision: number;
  remainingSeconds: number;
  estimatedReceive: string;
  depositUsd: string;
  route: string;
  networkFee: string;
  platformFee: string;
  boxFee?: string;
  expired: boolean;
  warning: boolean;
  label: string;
  /** chainlink = deposit USD came from a Sepolia spot read. */
  spotSource: "chainlink" | "fallback" | "error";
  spotNote: string;
  /** True when a token deposit cannot be priced from the live book. */
  spotBlocked: boolean;
  /** True when the output value cannot be priced from the live book. */
  outputBlocked: boolean;
  outputNote: string;
  /** Prices used for this quote. Live when the spot read succeeded. */
  prices: Partial<Record<string, number>>;
}

export function formatQuoteClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function quoteRemaining(issuedAtMs: number, nowMs: number): number {
  const elapsed = Math.max(0, Math.floor((nowMs - issuedAtMs) / 1000));
  return Math.max(0, QUOTE_TTL_SECONDS - elapsed);
}

export function quoteIsExpired(remainingSeconds: number): boolean {
  return remainingSeconds <= 0;
}

export function quoteNeedsWarning(remainingSeconds: number): boolean {
  return remainingSeconds > 0 && remainingSeconds <= QUOTE_WARNING_SECONDS;
}

export function quoteRoute(box: BoxDefinition, toggles: Record<string, string>): string {
  if (box.id === "red" && toggles.route === "cross-chain") {
    return "Sepolia → (demo) Axelar → destination chain";
  }
  if (box.id === "red") return "Sepolia (native)";
  return box.demo.route;
}

export function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export function tokenDepositUsd(
  state: FlowState,
  prices: Partial<Record<string, number>>,
): { usd: number; missing: string[] } {
  const missing: string[] = [];
  const usd = state.rows.reduce((sum, row) => {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    const price = prices[row.token];
    if (price === undefined || !Number.isFinite(price) || price <= 0) {
      missing.push(row.token);
      return sum;
    }
    return sum + price * amount;
  }, 0);
  return { usd, missing };
}

export function depositUsd(
  box: BoxDefinition,
  state: FlowState,
  prices: Partial<Record<string, number>> = FALLBACK_TOKEN_PRICES,
): number {
  if (box.id === "purple" && purpleMode(state.toggles) === "nft-to-alt") {
    return nftFloorTotal(state.selectedNfts);
  }
  if (box.id === "checkered" || box.assetMode === "wallet") return portfolioTotal();
  if (box.assetMode === "none") {
    return Number(state.machine.replace(/[^0-9.]/g, "")) || 0;
  }
  return tokenDepositUsd(state, prices).usd;
}

export function quoteNeedsSpot(box: BoxDefinition, state: FlowState): boolean {
  if (box.id === "purple" && purpleMode(state.toggles) === "nft-to-alt") return false;
  if (box.id === "checkered" || box.assetMode === "wallet" || box.assetMode === "none") return false;
  return state.rows.some((row) => {
    const amount = Number(row.amount);
    return Number.isFinite(amount) && amount > 0 && row.token !== "USDC";
  });
}

/**
 * Boxes whose receive line is a known-output USD value, not a catalogue preview.
 * Random, 1:1, match, and position boxes stay labelled simulations.
 * Red stays a whole-token preview: a dollar line would contradict "one whole token out".
 */
export function outputValueKind(box: BoxDefinition): "value" | "preview" {
  if (box.id === "orange" || box.id === "white" || box.id === "blue" || box.id === "green") {
    return "value";
  }
  if (box.id === "purple") return "value";
  if (box.flowKind === "mirror") return "value";
  return "preview";
}

export function outputNeedsSpot(box: BoxDefinition, state: FlowState): boolean {
  if (outputValueKind(box) !== "value") return false;
  if (box.id === "purple" && purpleMode(state.toggles) === "nft-to-alt") return false;
  return quoteNeedsSpot(box, state);
}

export interface OutputEstimate {
  line: string;
  blocked: boolean;
  note: string;
}

/** Net of the displayed 5% output fee. This is a spot value, not a pool fill. */
export const OUTPUT_FEE_RATE = 0.05;

/** Spec §6.3.1. Blue's offered basket must stay inside this band of the deposit. */
export const BLUE_SLIPPAGE_BAND = 0.01;

export function offerInsideBand(deposit: number, offer: number): boolean {
  if (!Number.isFinite(deposit) || deposit <= 0) return false;
  if (!Number.isFinite(offer) || offer <= 0) return false;
  return Math.abs(offer - deposit) / deposit <= BLUE_SLIPPAGE_BAND + 1e-9;
}

/**
 * USD total of Blue's offered basket, read from the basket's own catalogue
 * amounts. It is computed independently of the user's deposit so the ±1%
 * band comparison can actually fail. The 5% platform fee stays on its own line.
 */
export function offeredBasketUsd(box: BoxDefinition): number {
  return box.demo.assets.reduce((sum, asset) => {
    const usd = Number(asset.usd.replace(/[^0-9.]/g, ""));
    return Number.isFinite(usd) ? sum + usd : sum;
  }, 0);
}

export function estimatedReceive(
  box: BoxDefinition,
  state: FlowState,
  prices: Partial<Record<string, number>> = FALLBACK_TOKEN_PRICES,
  spotReady = false,
): OutputEstimate {
  if (box.flowKind === "random-swap" || box.flowKind === "random-box") {
    return {
      line: "??? — random output",
      blocked: false,
      note: "Random output stays unknown. This is not a pool read.",
    };
  }
  if (box.id === "russian-flag") {
    return {
      line: "POSITION OPEN — demo, no GMX position",
      blocked: false,
      note: "Russian Flag does not open a GMX position on Sepolia.",
    };
  }
  if (box.id === "checkered") {
    return {
      line: state.matchAccepted ? "Demo matched portfolio" : "Waiting for a demo match",
      blocked: false,
      note: "Checkered has no counterparty pool on Sepolia.",
    };
  }
  if (box.assetMode === "wallet") {
    return {
      line: "Wallet sweep — preview inventory",
      blocked: false,
      note: "Sweep inventory is a labelled preview, not a wallet read.",
    };
  }
  if (box.assetMode === "none") {
    return {
      line: `${state.machine} claw grab`,
      blocked: false,
      note: "Prize inventory is a labelled preview.",
    };
  }

  const kind = outputValueKind(box);
  const needs = outputNeedsSpot(box, state);
  if (kind === "value" && needs && !spotReady) {
    return { line: "Spot read required", blocked: true, note: OUTPUT_VALUE_BLOCKED };
  }

  const gross = depositUsd(box, state, prices);
  const net = gross * (1 - OUTPUT_FEE_RATE);
  if (box.id === "purple") {
    const mode = purpleMode(state.toggles);
    if (mode === "nft-to-alt") {
      return {
        line:
          state.selectedNfts.length === 0
            ? "Select NFTs to estimate"
            : `~ ${formatUsd(nftFloorTotal(state.selectedNfts))} in altcoins`,
        blocked: false,
        note: "NFT floors are a labelled preview.",
      };
    }
    return {
      line: `~ ${formatUsd(net)} in floor NFTs`,
      blocked: false,
      note: OUTPUT_VALUE_LABEL,
    };
  }
  if (box.id === "orange") {
    return {
      line: `~ ${formatUsd(net)} in WBTC`,
      blocked: false,
      note: OUTPUT_VALUE_LABEL,
    };
  }
  if (box.id === "blue") {
    // Spec §6.3.1: the offered basket must sit within ±1% of the deposit.
    // Compare the basket's own USD total to the deposit. A 5% output haircut
    // would always sit outside that band, so the fee stays on its own line.
    const offer = offeredBasketUsd(box);
    const inside = offerInsideBand(gross, offer);
    return {
      line: inside ? `~ ${formatUsd(offer)} offer · XCM + RIO + LINK` : "Offer outside ±1%",
      blocked: !inside,
      note: inside ? OFFER_BAND_LABEL : OFFER_OUTSIDE_BAND,
    };
  }
  if (box.id === "green") {
    return {
      line: `~ ${formatUsd(net)} in screened tokens`,
      blocked: false,
      note: OUTPUT_VALUE_LABEL,
    };
  }
  if (box.id === "white") {
    const charity = state.charityMode === "random" ? "a random charity" : "the chosen charity";
    return {
      line: `~ ${formatUsd(net)} donated as USDC to ${charity}`,
      blocked: false,
      note: OUTPUT_VALUE_LABEL,
    };
  }
  if (box.flowKind === "mirror") {
    return {
      line: `~ ${formatUsd(net)} across the catalogue basket`,
      blocked: false,
      note: OUTPUT_VALUE_LABEL,
    };
  }

  const assets = box.demo.assets.map((asset) => `${asset.amount} ${asset.symbol}`).join(" + ");
  return {
    line: assets ? `Catalogue preview · ~ ${assets}` : "No estimate",
    blocked: false,
    note: "Output amount is a catalogue preview, not a live pool read.",
  };
}

export function buildSimulatedQuote(
  box: BoxDefinition,
  state: FlowState,
  nowMs: number,
  spot?: {
    source: "chainlink" | "fallback" | "error";
    prices?: Partial<Record<string, number>>;
    note?: string;
  },
): SimulatedQuote {
  const remainingSeconds = quoteRemaining(state.quoteIssuedAt, nowMs);
  const expired = quoteIsExpired(remainingSeconds);
  const source = spot?.source ?? "fallback";
  const prices = source === "chainlink" ? { USDC: 1, ...spot?.prices } : FALLBACK_TOKEN_PRICES;
  const needsSpot = quoteNeedsSpot(box, state);
  const priced = tokenDepositUsd(state, prices);
  const spotReady = source === "chainlink" && priced.missing.length === 0;
  const spotBlocked = needsSpot && !spotReady;
  const output = estimatedReceive(box, state, prices, spotReady && !spotBlocked);
  const label = spotBlocked || output.blocked
    ? SPOT_BLOCKED_LABEL
    : source === "chainlink" && (needsSpot || outputNeedsSpot(box, state))
      ? output.note === OUTPUT_VALUE_LABEL
        ? OUTPUT_VALUE_LABEL
        : SPOT_LIVE_LABEL
      : QUOTE_DEMO_LABEL;
  return {
    revision: state.quoteRevision,
    remainingSeconds,
    estimatedReceive: output.line,
    depositUsd: spotBlocked ? "Spot read required" : formatUsd(depositUsd(box, state, prices)),
    route: quoteRoute(box, state.toggles),
    networkFee: box.flowKind === "gatcha" ? GATCHA_FEE_LINE : NETWORK_FEE_LINE,
    platformFee: PLATFORM_FEE_LINE,
    boxFee: box.id === "russian-flag" ? "Tax table applies to PnL, not to the deposit." : undefined,
    expired,
    warning: quoteNeedsWarning(remainingSeconds),
    label,
    spotSource: source,
    spotNote: spot?.note ?? label,
    spotBlocked,
    outputBlocked: output.blocked,
    outputNote: output.note,
    prices,
  };
}

/** Inputs that change the estimate. Editing them must re-issue the quote. */
export function quoteInputKey(state: FlowState): string {
  return JSON.stringify({
    rows: state.rows,
    toggles: state.toggles,
    charityMode: state.charityMode,
    machine: state.machine,
    selectedNfts: state.selectedNfts,
    floorSweep: state.floorSweep,
    offerAccepted: state.offerAccepted,
    matchAccepted: state.matchAccepted,
    matchPhase: state.matchPhase,
  });
}
