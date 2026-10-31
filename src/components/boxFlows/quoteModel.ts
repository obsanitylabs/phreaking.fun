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
export const QUOTE_DEMO_LABEL = "Simulated quote — no live pool or GMX read.";

export const NETWORK_FEE_LINE = "0.0012 ETH + 5% premium, charged in the native gas token";
export const PLATFORM_FEE_LINE = "5% of output (shown in the output token)";
export const GATCHA_FEE_LINE = "3% markup + 10% gas premium";

const TOKEN_PRICES: Record<string, number> = {
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

export function depositUsd(box: BoxDefinition, state: FlowState): number {
  if (box.id === "purple" && purpleMode(state.toggles) === "nft-to-alt") {
    return nftFloorTotal(state.selectedNfts);
  }
  if (box.id === "checkered" || box.assetMode === "wallet") return portfolioTotal();
  if (box.assetMode === "none") {
    return Number(state.machine.replace(/[^0-9.]/g, "")) || 0;
  }
  return state.rows.reduce((sum, row) => {
    const price = TOKEN_PRICES[row.token] ?? 0;
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) ? price * amount : 0);
  }, 0);
}

export function estimatedReceive(box: BoxDefinition, state: FlowState): string {
  if (box.flowKind === "random-swap" || box.flowKind === "random-box") {
    return "??? — random output";
  }
  if (box.id === "purple") {
    const mode = purpleMode(state.toggles);
    if (mode === "nft-to-alt") {
      return state.selectedNfts.length === 0
        ? "Select NFTs to estimate"
        : `~ ${formatUsd(nftFloorTotal(state.selectedNfts))} in altcoins`;
    }
    return `~ ${formatUsd(depositUsd(box, state))} in floor NFTs`;
  }
  if (box.id === "russian-flag") {
    return "POSITION OPEN — direction, entry, and a 24h countdown";
  }
  if (box.id === "checkered") {
    return state.matchAccepted ? "Matched counterparty portfolio" : "Waiting for a demo match";
  }
  if (box.id === "white") {
    return state.charityMode === "random" ? "Random charity donation" : "Chosen charity donation";
  }
  if (box.assetMode === "none") return `${state.machine} claw grab`;
  const assets = box.demo.assets.map((asset) => `${asset.amount} ${asset.symbol}`).join(" + ");
  return assets ? `~ ${assets}` : "No estimate";
}

export function buildSimulatedQuote(
  box: BoxDefinition,
  state: FlowState,
  nowMs: number,
): SimulatedQuote {
  const remainingSeconds = quoteRemaining(state.quoteIssuedAt, nowMs);
  const expired = quoteIsExpired(remainingSeconds);
  return {
    revision: state.quoteRevision,
    remainingSeconds,
    estimatedReceive: estimatedReceive(box, state),
    depositUsd: formatUsd(depositUsd(box, state)),
    route: quoteRoute(box, state.toggles),
    networkFee: box.flowKind === "gatcha" ? GATCHA_FEE_LINE : NETWORK_FEE_LINE,
    platformFee: PLATFORM_FEE_LINE,
    boxFee: box.id === "russian-flag" ? "Tax table applies to PnL, not to the deposit." : undefined,
    expired,
    warning: quoteNeedsWarning(remainingSeconds),
    label: QUOTE_DEMO_LABEL,
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
