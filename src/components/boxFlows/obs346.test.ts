import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BOX_BY_ID } from "../design/boxFlows/catalog";
import {
  MYSTERY_YOU_RECEIVE,
  RAINBOW_BLACK_SWEEP_WARNING,
  RAINBOW_POSSIBLE_OUTCOMES,
  RAINBOW_YOU_RECEIVE,
  mysteryYouReceive,
} from "./copy";
import { initialFlowState } from "./flowState";
import { buildSimulatedQuote } from "./quoteModel";
import { reviewReceiveLine, reviewWarnings } from "./reviewModel";
import { readBoxStatus } from "./boxStatusRead";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..", "..", "..");

const GC_SWEEP =
  "The deposit amount in that transaction can be lost in full and cannot be undone. Do not deposit assets you want to keep.";
const ISSUED_AT = 1_700_000_000_000;
const LIVE = {
  source: "chainlink" as const,
  prices: { ETH: 2000, USDC: 1 },
};

test("H1: Rainbow review keeps the spec receive line when the quote note says not a pool", () => {
  const rainbow = initialFlowState(BOX_BY_ID.rainbow);
  rainbow.quoteIssuedAt = ISSUED_AT;
  const quote = buildSimulatedQuote(BOX_BY_ID.rainbow, rainbow, ISSUED_AT, LIVE);
  assert.match(quote.outputNote, /not a pool/);
  assert.equal(reviewReceiveLine(BOX_BY_ID.rainbow, quote), RAINBOW_YOU_RECEIVE);
  assert.equal(
    reviewReceiveLine(BOX_BY_ID.rainbow, quote),
    "??? — the output of a randomly fired box. Its deposit rules apply.",
  );

  const mystery = buildSimulatedQuote(BOX_BY_ID.mystery, rainbow, ISSUED_AT, LIVE);
  assert.equal(reviewReceiveLine(BOX_BY_ID.mystery, mystery), MYSTERY_YOU_RECEIVE);
});

test("H2: the production box flow exposes no gate-clear dev controls", () => {
  const app = readFileSync(join(here, "BoxFlowApp.tsx"), "utf8");
  for (const marker of [
    "set-gate-",
    "Clear gate",
    "Preview paused",
    "Preview cap",
    "Preview wrong network",
  ]) {
    assert.equal(app.includes(marker), false, `BoxFlowApp still exposes ${marker}`);
  }
});

test("H3: the status read receives the live deposit and connected account", () => {
  const app = readFileSync(join(here, "BoxFlowApp.tsx"), "utf8");
  const start = app.indexOf("readBoxStatus({");
  const end = app.indexOf("})", start);
  const call = app.slice(start, end + 2);
  assert.match(call, /depositUsd1e8/);
  assert.match(call, /account:/);
  assert.match(call, /address/);
  assert.match(app, /\}, \[selected, depositUsd1e8, address\]\);/);
});

test("H4: a failed cap sub-read fails closed instead of becoming unlimited", async () => {
  type ReadStatusInput = Parameters<typeof readBoxStatus>[0];
  type StatusClient = NonNullable<ReadStatusInput["client"]>;
  const client: StatusClient = {
    multicall: async ({ contracts }) =>
      contracts.map((contract) => {
        if (contract.functionName === "paused") {
          return { status: "success" as const, result: false };
        }
        if (contract.functionName === "perTransactionCap") {
          return { status: "failure" as const };
        }
        return { status: "success" as const, result: BigInt(0) };
      }),
  };
  const snapshot = await readBoxStatus({
    boxId: "mystery",
    depositUsd1e8: BigInt(200),
    search: "?boxAddress=0x1111111111111111111111111111111111111111",
    client,
  });
  assert.equal(snapshot.source, "error");
  assert.equal(snapshot.paused, true);
  assert.equal(snapshot.blockingCap, null);
});

test("M2: Blue's offer band compares the basket USD to the deposit", () => {
  const matching = initialFlowState(BOX_BY_ID.blue);
  matching.rows = [{ token: "ETH", amount: "0.5" }];
  matching.quoteIssuedAt = ISSUED_AT;
  const inside = buildSimulatedQuote(BOX_BY_ID.blue, matching, ISSUED_AT, LIVE);
  assert.equal(inside.outputBlocked, false);
  assert.match(inside.estimatedReceive, /\$1,000\.00 offer/);

  const outside = buildSimulatedQuote(
    BOX_BY_ID.blue,
    { ...matching, rows: [{ token: "ETH", amount: "0.55" }] },
    ISSUED_AT,
    LIVE,
  );
  assert.equal(outside.outputBlocked, true);
  assert.equal(outside.estimatedReceive, "Offer outside ±1%");
});

test("M3: the Mystery receive line interpolates the real pool count", () => {
  assert.equal(mysteryYouReceive(), "??? — one token from the 18-token pool");
  assert.equal(MYSTERY_YOU_RECEIVE, "??? — one token from the 18-token pool");
  const mystery = initialFlowState(BOX_BY_ID.mystery);
  mystery.quoteIssuedAt = ISSUED_AT;
  const quote = buildSimulatedQuote(BOX_BY_ID.mystery, mystery, ISSUED_AT, LIVE);
  assert.equal(
    reviewReceiveLine(BOX_BY_ID.mystery, quote),
    "??? — one token from the 18-token pool",
  );
});

test("GC: the Black sweep disclosure publishes only the OBS-527 sentence", () => {
  assert.equal(RAINBOW_BLACK_SWEEP_WARNING, GC_SWEEP);
  assert.ok(reviewWarnings(BOX_BY_ID.rainbow).includes(GC_SWEEP));
  assert.ok(BOX_BY_ID.black.warnings.includes(GC_SWEEP));
  assert.equal(
    RAINBOW_POSSIBLE_OUTCOMES,
    "Possible outcomes: any other box can fire — from a 1:1 token swap (Red) to Black.",
  );

  const copy = readFileSync(join(here, "copy.ts"), "utf8");
  const catalog = readFileSync(join(repo, "src/components/design/boxFlows/catalog.ts"), "utf8");
  const docs = readFileSync(join(repo, "docs/design/box-ux-flows.md"), "utf8");
  assert.ok(copy.includes(GC_SWEEP));
  assert.ok(catalog.includes(GC_SWEEP));
  assert.ok(docs.includes(GC_SWEEP));
  for (const phrase of [
    "full wallet sweep",
    "sweeps the entire wallet",
    "covers your entire wallet",
  ]) {
    assert.equal(copy.includes(phrase), false, `copy.ts still publishes "${phrase}"`);
    assert.equal(catalog.includes(phrase), false, `catalog.ts still publishes "${phrase}"`);
    assert.equal(docs.includes(phrase), false, `docs still publish "${phrase}"`);
  }
  assert.equal(copy.includes("entire wallet"), false);
});

test("legacy home route cannot reach a token approval", () => {
  const home = readFileSync(join(repo, "src/app/HomeClient.tsx"), "utf8");
  assert.equal(home.includes("EnhancedMysteryBoxModal"), false);
  const store = readFileSync(join(repo, "src/stores/blockchainStore.ts"), "utf8");
  assert.equal(store.includes("get().approveTokens("), false);
  const hook = readFileSync(join(repo, "src/hooks/useBlockchain.ts"), "utf8");
  assert.equal(hook.includes("await approveTokens("), false);
});
