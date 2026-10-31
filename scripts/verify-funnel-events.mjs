// OBS-354 — frontend funnel-event acceptance harness.
//
// Loads the REAL public/obs-analytics.js in a minimal simulated-browser context, drives
// the wired analytics helpers through the acceptance sequence, captures the exact
// `POST /api/collect` bodies (sendBeacon payloads), and validates every event against the
// REAL collector allowlist (netlify/shared/enforce.mjs validatBatch).
//
// Run: node --import tsx scripts/verify-funnel-events.mjs
//
// This proves the emitted payloads are the ones /api/collect will receive and that the
// collector accepts them. The live browser + Sepolia wallet capture remains DevRel's
// OBS-304 harness on the deployed site.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

import { validateBatch, validateEvent } from "../netlify/shared/enforce.mjs";
import analytics from "../src/lib/analytics.ts";

const {
  trackActivationComplete,
  trackBoxConfigured,
  trackBoxOpened,
  trackPurchaseConfirmed,
  trackWalletConnected,
} = analytics;

const here = dirname(fileURLToPath(import.meta.url));
const sdkSource = readFileSync(join(here, "../public/obs-analytics.js"), "utf8");

class MemoryStorage {
  constructor() {
    this.m = new Map();
  }
  getItem(k) {
    return this.m.has(k) ? this.m.get(k) : null;
  }
  setItem(k, v) {
    this.m.set(k, String(v));
  }
  removeItem(k) {
    this.m.delete(k);
  }
}

class FakeBlob {
  constructor(parts) {
    this.parts = parts;
  }
  text() {
    return this.parts.join("");
  }
}

const bodies = [];

const sessionStorage = new MemoryStorage();
const localStorage = new MemoryStorage();

const windowObj = {
  OBS_ANALYTICS_PRODUCT: "pff",
  OBS_BUILD_VERSION: "",
  sessionStorage,
  localStorage,
  crypto: globalThis.crypto,
  addEventListener: () => {},
};

globalThis.window = windowObj;
globalThis.sessionStorage = sessionStorage;
globalThis.localStorage = localStorage;
globalThis.document = { referrer: "" };
globalThis.location = { search: "", pathname: "/" };
globalThis.URLSearchParams = globalThis.URLSearchParams;
globalThis.Blob = FakeBlob;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    sendBeacon(url, blob) {
      bodies.push({ url, json: blob.parts.join("") });
      return true;
    },
  },
});

vm.runInThisContext(sdkSource, { filename: "obs-analytics.js" });

if (!windowObj.OBS || typeof windowObj.OBS.event !== "function") {
  console.error("FAIL: SDK did not expose window.OBS.event");
  process.exit(1);
}

// --- Acceptance sequence (home modal flow, Blue Box) -------------------------
const CHAIN = 11155111;
windowObj.OBS.page("/"); // SDK auto page_view
trackWalletConnected(CHAIN, "metaMask", "MetaMask");
trackBoxConfigured(CHAIN);
// Genuine on-chain purchase confirmation (funnel step 2) — never the box-open edge.
trackPurchaseConfirmed(CHAIN);
trackActivationComplete("blue", "blue_box_home_modal");
trackBoxOpened("blue"); // first open
trackBoxOpened("blue"); // second open

// --- Flatten captured events ------------------------------------------------
const events = bodies.flatMap((b) => JSON.parse(b.json).events);
const { accepted, stats } = validateBatch(events);

console.log(`captured ${bodies.length} POST /api/collect calls, ${events.length} events`);
console.log("collector stats:", stats);
console.log("\nallowlisted payloads (the exact attributes persisted):");
for (const e of accepted) {
  const { product, anonymous_id, session_id, timestamp, referrer, ...rest } = e;
  console.log(JSON.stringify({ product, ...rest }));
}

const expected = [
  "page_view",
  "wallet_connected",
  "funnel_step", // box_configured (step 1)
  "funnel_step", // purchase_confirmed (step 2)
  "activation_complete",
  "core_action", // box_opened (1st)
  "core_action", // box_opened (2nd)
];

// Ordering is asserted on ALL captured events (the collector never reorders).
const emitted = events.map((e) => e.event_name);
let ok = JSON.stringify(emitted) === JSON.stringify(expected);

// Every emitted payload must be accepted by the collector. (The earlier
// `activation_complete` / first_session validator gap was fixed by OBS-355.)
const rejected = events
  .map((e) => ({ e, r: validateEvent(e) }))
  .filter(({ r }) => !r.ok);
if (rejected.length !== 0) ok = false;
console.log(
  "\nrejected by collector (expected: none):",
  rejected.map(({ e, r }) => `${e.event_name} → ${r.reason}`),
);

const hn = accepted.map((e) => e.event_name);
if (JSON.stringify(hn) !== JSON.stringify(expected)) ok = false;

const wc = accepted.find((e) => e.event_name === "wallet_connected");
if (!wc || wc.chain_id !== CHAIN || wc.wallet_connected !== true) ok = false;
const cfg = accepted.find((e) => e.funnel_name === "pff_purchase" && e.step_name === "box_configured");
if (!cfg || cfg.step_index !== 1) ok = false;
const conf = accepted.find((e) => e.funnel_name === "pff_purchase" && e.step_name === "purchase_confirmed");
if (!conf || conf.step_index !== 2) ok = false;
// Closed list (§4.4): no `purchase_submitted` may ever be emitted for pff_purchase.
if (events.some((e) => e.step_name === "purchase_submitted")) ok = false;
const opens = accepted.filter((e) => e.event_name === "core_action");
if (opens.length !== 2) ok = false;

console.log("\nFX-ACCEPTANCE:", ok ? "PASS" : "FAIL");
process.exit(ok ? 0 : 1);
