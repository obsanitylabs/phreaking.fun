// OBS-354 — campaign-funnel event wiring on top of the OBS-125 first-party SDK.
//
// The SDK (public/obs-analytics.js, loaded in src/app/layout.tsx) exposes
// `window.OBS.event(name, attrs)`; it stamps `product='pff'`, anonymous_id/session_id,
// D4 UTMs, timestamp and referrer itself. Every emit here is guarded so the app never
// throws if the SDK failed to load.
//
// Attributes are limited to the collector allowlist (netlify/shared/enforce.mjs) and the
// OBS-219 metric-dictionary v2 §2.2 rules: NEVER wallet addresses, tx hashes, emails, or
// free-text errors. Sepolia (11155111) only.

export type ObsWalletType =
  | "metamask"
  | "walletconnect"
  | "web3auth"
  | "keplr"
  | "other";

export type ObsBoxType = "mystery" | "white" | "silver" | "blue";

type ObsAttrs = Record<string, string | number | boolean>;

interface ObsSDK {
  event: (name: string, attrs?: ObsAttrs) => void;
}

export const SEPOLIA_CHAIN_ID = 11155111;

const F_KEY = "obs_pff_session_start";
const F_WALLET = "obs_pff_wallet_sepolia";
const F_CONFIGURED = "obs_pff_box_configured";
const F_ACTIVATED = "obs_pff_activated";
const F_SESSION_SEEN = "obs_pff_session_seen";

function getObs(): ObsSDK | null {
  if (typeof window === "undefined") return null;
  const obs = (window as unknown as { OBS?: ObsSDK }).OBS;
  return obs && typeof obs.event === "function" ? obs : null;
}

function emit(name: string, attrs: ObsAttrs): void {
  const obs = getObs();
  if (!obs) return;
  try {
    obs.event(name, attrs);
  } catch {
    // Analytics must never take the app down.
  }
}

function readStore(store: "session" | "local", key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return (store === "session" ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStore(store: "session" | "local", key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    (store === "session" ? window.sessionStorage : window.localStorage).setItem(key, value);
  } catch {
    // Private-mode / disabled storage — analytics is best-effort.
  }
}

function sessionStartMs(): number {
  const existing = readStore("session", F_KEY);
  if (existing) {
    const parsed = parseInt(existing, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  const now = Date.now();
  writeStore("session", F_KEY, String(now));
  return now;
}

export function mapWalletType(
  connectorId?: string,
  connectorName?: string,
): ObsWalletType {
  const haystack = `${connectorId ?? ""} ${connectorName ?? ""}`.toLowerCase();
  if (haystack.includes("metamask")) return "metamask";
  if (haystack.includes("walletconnect")) return "walletconnect";
  if (haystack.includes("web3auth")) return "web3auth";
  if (haystack.includes("keplr")) return "keplr";
  return "other";
}

export function mapBoxType(boxType: string | undefined): ObsBoxType {
  switch ((boxType ?? "").toLowerCase()) {
    case "white":
      return "white";
    case "silver":
      return "silver";
    case "blue":
      return "blue";
    default:
      return "mystery";
  }
}

export function hasWalletConnectedSepolia(): boolean {
  return readStore("session", F_WALLET) === "1";
}

// `wallet_connected` — on wagmi/RainbowKit connect success AND auto-reconnect, only when
// the connected chain is Sepolia. Once per session (dictionary counts distinct
// anonymous_id). Always carries the common `wallet_connected: true` marker.
export function trackWalletConnected(
  chainId: number | undefined,
  connectorId?: string,
  connectorName?: string,
): void {
  if (chainId !== SEPOLIA_CHAIN_ID) return;
  if (readStore("session", F_WALLET) === "1") return;
  writeStore("session", F_WALLET, "1");
  emit("wallet_connected", {
    wallet_type: mapWalletType(connectorId, connectorName),
    chain_id: SEPOLIA_CHAIN_ID,
    wallet_connected: true,
  });
}

// `funnel_step` funnel_name=pff_purchase — first completed box configuration
// (OBS-307 vocabulary: `box_configured`), emitted once per session.
export function trackBoxConfigured(chainId: number | undefined): void {
  if (readStore("session", F_CONFIGURED) === "1") return;
  writeStore("session", F_CONFIGURED, "1");
  emit("funnel_step", {
    funnel_name: "pff_purchase",
    step_index: 1,
    step_name: "box_configured",
    chain_id: chainId ?? SEPOLIA_CHAIN_ID,
  });
}

export function trackPurchaseSubmitted(chainId: number | undefined): void {
  emit("funnel_step", {
    funnel_name: "pff_purchase",
    step_index: 2,
    step_name: "purchase_submitted",
    chain_id: chainId ?? SEPOLIA_CHAIN_ID,
  });
}

export function trackPurchaseConfirmed(chainId: number | undefined): void {
  emit("funnel_step", {
    funnel_name: "pff_purchase",
    step_index: 3,
    step_name: "purchase_confirmed",
    chain_id: chainId ?? SEPOLIA_CHAIN_ID,
  });
}

// `core_action` action_type=box_opened — on every successful box open.
export function trackBoxOpened(boxType: string | undefined): void {
  emit("core_action", {
    action_type: "box_opened",
    box_type: mapBoxType(boxType),
  });
}

// `activation_complete` — FIRST box_opened per anonymous_id where a Sepolia
// `wallet_connected` exists (dictionary v2 §4.1). Persisted per anonymous_id.
export function trackActivationComplete(
  boxType: string | undefined,
  activationPath: string,
): void {
  if (readStore("local", F_ACTIVATED) === "1") return;
  if (!hasWalletConnectedSepolia()) return;
  writeStore("local", F_ACTIVATED, "1");
  const firstSession = readStore("session", F_SESSION_SEEN) === null;
  writeStore("session", F_SESSION_SEEN, "1");
  emit("activation_complete", {
    first_session: firstSession,
    time_to_activation_s: Math.max(
      0,
      Math.round((Date.now() - sessionStartMs()) / 1000),
    ),
    box_type: mapBoxType(boxType),
    activation_path: activationPath.slice(0, 255),
  });
}

// Box open helper used by both flows: emits activation (first open) + core_action.
export function trackBoxOpenedWithActivation(
  boxType: string | undefined,
  activationPath: string,
): void {
  trackActivationComplete(boxType, activationPath);
  trackBoxOpened(boxType);
}

// Test-only reset of the module/session state.
export function __resetAnalyticsForTests(): void {
  if (typeof window === "undefined") return;
  try {
    [F_KEY, F_WALLET, F_CONFIGURED, F_SESSION_SEEN].forEach((k) =>
      window.sessionStorage.removeItem(k),
    );
    window.localStorage.removeItem(F_ACTIVATED);
  } catch {
    // ignore
  }
}
