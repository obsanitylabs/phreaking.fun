import type { BoxDefinition } from "@/components/design/boxFlows/types";

export type FlowStep =
  | "configure"
  | "review"
  | "sign"
  | "finality"
  | "result"
  | "error";

export type GateKind = "none" | "paused" | "cap" | "wrong-network" | "locked";

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
  notice: string | null;
  charityMode: "random" | "choose";
  machine: "$1" | "$10" | "$100";
  stageIndex: number;
  signing: boolean;
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
    notice: null,
    charityMode: "random",
    machine: "$10",
    stageIndex: 0,
    signing: false,
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

export function canAdvanceFromConfigure(box: BoxDefinition, state: FlowState): boolean {
  if (state.gate === "paused" || state.gate === "cap" || state.gate === "wrong-network") {
    return false;
  }
  if (state.gate === "locked" || box.status === "locked") return false;
  if (box.assetMode === "wallet" || box.assetMode === "none") return true;
  return state.rows.some((row) => Number(row.amount) > 0);
}

export function canConfirmReview(box: BoxDefinition, state: FlowState): boolean {
  if (state.gate !== "none" && state.gate !== "locked") return false;
  if (box.requiresAcknowledgement && !state.acknowledged) return false;
  return true;
}

/** Sepolia slice does not broadcast. Sign is a preview that returns to review. */
export function signBlockedReason(): string {
  return "Sepolia preview only. This screen does not request a signature or send a transaction.";
}
