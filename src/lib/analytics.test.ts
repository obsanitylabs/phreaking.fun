import test from "node:test";
import assert from "node:assert/strict";

import {
  mapBoxType,
  mapWalletType,
  trackActivationComplete,
  trackBoxConfigured,
  trackBoxOpened,
  trackBoxOpenedWithActivation,
  trackPurchaseConfirmed,
  trackWalletConnected,
  __resetAnalyticsForTests,
  SEPOLIA_CHAIN_ID,
} from "./analytics";

type Captured = { name: string; attrs: Record<string, unknown> };

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

function installWindow(withSdk = true) {
  const captured: Captured[] = [];
  const sessionStorage = new MemoryStorage();
  const localStorage = new MemoryStorage();
  const win: Record<string, unknown> = { sessionStorage, localStorage };
  if (withSdk) {
    win.OBS = {
      event: (name: string, attrs: Record<string, unknown> = {}) =>
        captured.push({ name, attrs }),
    };
  }
  (globalThis as unknown as { window: unknown }).window = win;
  return { captured, sessionStorage, localStorage };
}

test.beforeEach(() => {
  __resetAnalyticsForTests();
  delete (globalThis as unknown as { window?: unknown }).window;
});

test("mapWalletType maps connector ids to the dictionary enum", () => {
  assert.equal(mapWalletType("metaMask", "MetaMask"), "metamask");
  assert.equal(mapWalletType("walletConnect", "WalletConnect"), "walletconnect");
  assert.equal(mapWalletType("web3auth", "Web3Auth"), "web3auth");
  assert.equal(mapWalletType("keplr", "Keplr"), "keplr");
  assert.equal(mapWalletType("coinbaseWalletSDK", "Coinbase Wallet"), "other");
  assert.equal(mapWalletType(undefined, undefined), "other");
});

test("mapBoxType only emits collector-allowed box types", () => {
  assert.equal(mapBoxType("blue"), "blue");
  assert.equal(mapBoxType("White"), "white");
  assert.equal(mapBoxType("silver"), "silver");
  assert.equal(mapBoxType("gold"), "mystery");
  assert.equal(mapBoxType(undefined), "mystery");
});

test("wallet_connected only fires on Sepolia and once per session", () => {
  const { captured } = installWindow();

  trackWalletConnected(1, "metaMask", "MetaMask");
  assert.equal(captured.length, 0, "mainnet/non-Sepolia must not emit");

  trackWalletConnected(SEPOLIA_CHAIN_ID, "metaMask", "MetaMask");
  trackWalletConnected(SEPOLIA_CHAIN_ID, "metaMask", "MetaMask");

  assert.equal(captured.length, 1);
  assert.deepEqual(captured[0], {
    name: "wallet_connected",
    attrs: {
      wallet_type: "metamask",
      chain_id: SEPOLIA_CHAIN_ID,
      wallet_connected: true,
    },
  });
});

test("funnel steps carry funnel_name, monotonic step_index and chain_id", () => {
  const { captured } = installWindow();

  trackBoxConfigured(SEPOLIA_CHAIN_ID);
  trackBoxConfigured(SEPOLIA_CHAIN_ID); // once per session
  trackPurchaseConfirmed(SEPOLIA_CHAIN_ID);

  assert.deepEqual(
    captured.map((c) => c.name),
    ["funnel_step", "funnel_step"],
  );
  assert.deepEqual(captured[0].attrs, {
    funnel_name: "pff_purchase",
    step_index: 1,
    step_name: "box_configured",
    chain_id: SEPOLIA_CHAIN_ID,
  });
  assert.deepEqual(captured[1].attrs, {
    funnel_name: "pff_purchase",
    step_index: 2,
    step_name: "purchase_confirmed",
    chain_id: SEPOLIA_CHAIN_ID,
  });
});

test("pff_purchase funnel_step vocabulary is the §4.4 closed list only", () => {
  const { captured } = installWindow();

  trackBoxConfigured(SEPOLIA_CHAIN_ID);
  trackPurchaseConfirmed(SEPOLIA_CHAIN_ID);

  const steps = captured.map((c) => c.attrs.step_name as string);
  assert.deepEqual(steps, ["box_configured", "purchase_confirmed"]);
  assert.equal(steps.includes("purchase_submitted"), false);
  assert.deepEqual(
    captured.map((c) => c.attrs.step_index as number),
    [1, 2],
  );
});

test("core_action box_opened fires on every open; activation only once", () => {
  const { captured } = installWindow();

  trackWalletConnected(SEPOLIA_CHAIN_ID, "metaMask", "MetaMask");
  trackBoxConfigured(SEPOLIA_CHAIN_ID);

  // First open.
  trackBoxOpenedWithActivation("blue", "blue_box_home_modal");
  // Second open.
  trackBoxOpenedWithActivation("blue", "blue_box_home_modal");

  const emitted = captured.map((c) => c.name);
  assert.deepEqual(emitted, [
    "wallet_connected",
    "funnel_step",
    "activation_complete",
    "core_action",
    "core_action",
  ]);

  const activations = captured.filter((c) => c.name === "activation_complete");
  assert.equal(activations.length, 1);
  assert.equal(activations[0].attrs.box_type, "blue");
  assert.equal(activations[0].attrs.activation_path, "blue_box_home_modal");
  assert.equal(typeof activations[0].attrs.first_session, "boolean");
  assert.equal(typeof activations[0].attrs.time_to_activation_s, "number");

  const opens = captured.filter((c) => c.name === "core_action");
  assert.equal(opens.length, 2);
  assert.deepEqual(opens[0].attrs, {
    action_type: "box_opened",
    box_type: "blue",
  });
});

test("activation_complete is withheld without a Sepolia wallet_connected", () => {
  const { captured } = installWindow();

  trackBoxOpenedWithActivation("silver", "silver_box_home_modal");

  assert.deepEqual(
    captured.map((c) => c.name),
    ["core_action"],
  );
});

test("emits are no-ops (never throw) when window.OBS is missing", () => {
  installWindow(false);
  assert.doesNotThrow(() => {
    trackWalletConnected(SEPOLIA_CHAIN_ID, "metaMask", "MetaMask");
    trackBoxConfigured(SEPOLIA_CHAIN_ID);
    trackPurchaseConfirmed(SEPOLIA_CHAIN_ID);
    trackBoxOpened("blue");
    trackActivationComplete("blue", "blue_box_home_modal");
  });
});

test("full acceptance ordering: page_view → wallet → configure → confirm → open+activate → open", () => {
  const { captured } = installWindow();

  // SDK auto page_view is emitted by public/obs-analytics.js, not this module.
  trackWalletConnected(SEPOLIA_CHAIN_ID, "walletConnect", "WalletConnect");
  trackBoxConfigured(SEPOLIA_CHAIN_ID);
  // Genuine on-chain purchase confirmation (not the box-open edge).
  trackPurchaseConfirmed(SEPOLIA_CHAIN_ID);
  trackBoxOpenedWithActivation("blue", "blue_box_home_modal");
  trackBoxOpenedWithActivation("blue", "blue_box_home_modal");

  assert.deepEqual(
    captured.map((c) => c.name),
    [
      "wallet_connected",
      "funnel_step",
      "funnel_step",
      "activation_complete",
      "core_action",
      "core_action",
    ],
  );
  assert.deepEqual(
    captured
      .filter((c) => c.name === "funnel_step")
      .map((c) => c.attrs.step_name),
    ["box_configured", "purchase_confirmed"],
  );
});
