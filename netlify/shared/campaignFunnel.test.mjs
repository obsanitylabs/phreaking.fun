// OBS-303 — campaign funnel + on-chain overlay unit tests (run: node --test netlify/shared/).
// Commits the funnel definitions (metric dictionary v2, OBS-297 measurement-plan §1) and the
// overlay aggregation privacy rules to the repo so C0–C3 and the overlay are reproducible
// without trusting a run log.
"use strict";
import { test } from "node:test";
import assert from "node:assert/strict";
import { campaignFunnel } from "./campaignFunnel.mjs";
import {
  aggregateDeposits,
  failedTxRate,
  resolveBoxes,
  DEPOSIT_EVENT,
} from "./onchainOverlay.mjs";
import { encodeEventTopics, encodeAbiParameters } from "viem";

const ISO = "2026-10-31T00:00:00.000Z";
const A = "01234567-89ab-cdef-0123-456789abcdef";
const B = "01234567-89ab-cdef-0123-456789abcde2";
const C = "01234567-89ab-cdef-0123-456789abcde3";
const pff = (o) => ({
  product: "pff",
  anonymous_id: A,
  session_id: A,
  timestamp: ISO,
  ...o,
});

test("campaignFunnel: C1 counts distinct anonymous_id at box_configured (first occurrence only)", () => {
  const f = campaignFunnel([
    pff({
      event_name: "funnel_step",
      funnel_name: "pff_purchase",
      step_name: "box_configured",
      step_index: 1,
    }),
    pff({
      event_name: "funnel_step",
      funnel_name: "pff_purchase",
      step_name: "box_configured",
      step_index: 2,
    }),
    pff({
      event_name: "funnel_step",
      funnel_name: "pff_purchase",
      step_name: "box_configured",
      anonymous_id: B,
    }),
  ]);
  assert.equal(f.c_configured, 2);
});

test("campaignFunnel: C1 ignores other funnels/steps and other products", () => {
  const f = campaignFunnel([
    pff({
      event_name: "funnel_step",
      funnel_name: "pff_purchase",
      step_name: "checkout",
    }),
    pff({
      event_name: "funnel_step",
      funnel_name: "other_funnel",
      step_name: "box_configured",
    }),
    {
      product: "ubs",
      event_name: "funnel_step",
      funnel_name: "pff_purchase",
      step_name: "box_configured",
      anonymous_id: C,
      session_id: C,
      timestamp: ISO,
    },
  ]);
  assert.equal(f.c_configured, 0);
});

test("campaignFunnel: C2 counts distinct activation_complete", () => {
  const f = campaignFunnel([
    pff({ event_name: "activation_complete" }),
    pff({ event_name: "activation_complete", anonymous_id: B }),
  ]);
  assert.equal(f.c_firstOpen, 2);
});

test("campaignFunnel: C3 = anonymous_id with >=2 box_opened; openers with >=1", () => {
  const f = campaignFunnel([
    pff({ event_name: "core_action", action_type: "box_opened" }), // A: 1 open
    pff({ event_name: "core_action", action_type: "box_opened" }),
    pff({ event_name: "core_action", action_type: "box_opened" }),
    pff({
      event_name: "core_action",
      action_type: "box_opened",
      anonymous_id: B,
    }), // B: 1 open
    pff({
      event_name: "core_action",
      action_type: "collection_viewed",
      anonymous_id: C,
    }), // not an open
  ]);
  assert.equal(f.c_repeatOpen, 1);
  assert.equal(f.openers, 2);
  assert.equal(f.repeatOpenRate, 0.5);
});

test("campaignFunnel: repeat-open rate is repeat/openers (OBS-297 §2), not repeat/C2", () => {
  const f = campaignFunnel([
    pff({ event_name: "activation_complete", anonymous_id: B }),
    pff({
      event_name: "core_action",
      action_type: "box_opened",
      anonymous_id: B,
    }),
    pff({
      event_name: "core_action",
      action_type: "box_opened",
      anonymous_id: B,
    }),
    pff({
      event_name: "core_action",
      action_type: "box_opened",
      anonymous_id: B,
    }),
  ]);
  assert.equal(f.boxOpenRate, 0); // C1=0 → 0 (no configured step), never division error
  assert.equal(f.repeatOpenRate, 1);
});

test("campaignFunnel: box-open rate is C2/C1; 0 (never division error) when C1=0", () => {
  const f = campaignFunnel([
    pff({ event_name: "activation_complete" }), // C2 without C1
  ]);
  assert.equal(f.boxOpenRate, 0);
  assert.equal(f.c_configured, 0);
});

test("campaignFunnel: events without anonymous_id or wrong product are skipped", () => {
  const f = campaignFunnel([
    pff({ event_name: "activation_complete", anonymous_id: undefined }),
    null,
    {
      product: "ubs",
      event_name: "activation_complete",
      anonymous_id: B,
      session_id: B,
      timestamp: ISO,
    },
  ]);
  assert.equal(f.c_firstOpen, 0);
});

// --- overlay aggregation privacy rules ---

const dlog = (user, token, amount) => ({
  address: "0x30bbe3c4942a74b3effdfe1b6157a46a7c0eadf5",
  topics: encodeEventTopics({
    abi: [DEPOSIT_EVENT],
    eventName: "DepositReceived",
    args: { user, token },
  }),
  data: encodeAbiParameters([{ type: "uint256" }], [amount]),
});

test("aggregateDeposits: sums native and erc20 volumes per box, counts separately", () => {
  const NATIVE = "0x0000000000000000000000000000000000000000";
  const TOKEN = "0x1c7d4b196cb0c7b01d7434fbc6116a902379c238";
  const got = aggregateDeposits([
    dlog("0x" + "11".repeat(20), NATIVE, BigInt(1e18)),
    dlog("0x" + "22".repeat(20), NATIVE, BigInt("1500000000000000000")),
    dlog("0x" + "33".repeat(20), TOKEN, BigInt(5)),
  ]);
  const box = Object.values(got)[0];
  assert.equal(box.count, 3);
  assert.equal(box.native, "2.5");
  assert.equal(box.erc20Transfers, 1);
  assert.equal(box.erc20Tokens, 1);
  // privacy: no wallet or token addresses in the aggregate output
  const s = JSON.stringify(got);
  assert.ok(!/2222|3333|1c7d4b/i.test(s));
  assert.ok(!s.includes("0x" + "11".repeat(20)));
});

test("aggregateDeposits: undecodable logs are skipped, never crash", () => {
  assert.deepEqual(
    aggregateDeposits([{ data: "0xdeadbeef", topics: ["0x00"] }, null]),
    {},
  );
});

test("failedTxRate: null rate (never fabricated) with zero attempts", () => {
  assert.equal(failedTxRate({ attempted: 0, failed: 0 }).rate, null);
  const r = failedTxRate({ attempted: 8, failed: 2 });
  assert.equal(r.rate, 0.25);
  assert.deepEqual([r.attempted, r.failed], [8, 2]);
});

test("resolveBoxes: env override keeps only valid addresses; default fleet without env", () => {
  const d = resolveBoxes(undefined);
  assert.equal(Object.keys(d).length, 2);
  const o = resolveBoxes({
    PFF_BOX_ADDRESSES:
      '{"mystery":"0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5","bad":"0xnope"}',
  });
  assert.deepEqual(Object.keys(o), ["mystery"]);
});
