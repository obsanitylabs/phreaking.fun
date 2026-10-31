export type BoxId =
  | "mystery"
  | "red"
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "white"
  | "black"
  | "rainbow"
  | "checkered"
  | "russian-flag"
  | "silver"
  | "gold"
  | "diamond"
  | "coin-gatcha";

export type ToolkitId = "core" | "refresh" | "adrenaline" | "vibe" | "arcade";

export type FlowKind =
  | "random-swap"
  | "fixed-swap"
  | "portfolio-offer"
  | "recycle"
  | "dust-to-btc"
  | "nft-swap"
  | "donation"
  | "wallet-sweep"
  | "random-box"
  | "portfolio-match"
  | "mirror"
  | "leveraged-trade"
  | "gatcha";

export type AssetMode = "single" | "multi" | "wallet" | "nft" | "none";

export type BoxStatus = "sepolia" | "locked" | "demo";

export type ResultKind =
  | "swap"
  | "basket"
  | "donation"
  | "harold-nft"
  | "random"
  | "position"
  | "matched"
  | "gatcha";

export interface ToggleOption {
  id: string;
  label: string;
  help: string;
}

export interface BoxToggle {
  id: string;
  label: string;
  options: ToggleOption[];
}

export interface DemoAsset {
  symbol: string;
  amount: string;
  usd: string;
}

export interface DemoResult {
  eyebrow: string;
  headline: string;
  assets: DemoAsset[];
  note: string;
  route: string;
  triggeredBox?: string;
  coingecko?: boolean;
  dexscreener?: boolean;
}

export interface BoxDefinition {
  id: BoxId;
  name: string;
  mechanicLabel: string;
  toolkit: ToolkitId;
  accent: string;
  gradient?: boolean;
  icon: string;
  oneLine: string;
  detail: string;
  assetMode: AssetMode;
  flowKind: FlowKind;
  resultKind: ResultKind;
  status: BoxStatus;
  chips?: string[];
  toggles?: BoxToggle[];
  warnings: string[];
  requiresAcknowledgement?: boolean;
  acknowledgement?: string;
  eligibility?: { id: string; label: string }[];
  demo: DemoResult;
}

export interface ToolkitDefinition {
  id: ToolkitId;
  label: string;
  notice: string;
}
