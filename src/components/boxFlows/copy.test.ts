import assert from "node:assert/strict";
import test from "node:test";
import { BOXES, BOX_BY_ID } from "../design/boxFlows/catalog";
import {
  RAINBOW_ACKNOWLEDGEMENT,
  RAINBOW_BLACK_SWEEP_WARNING,
  RAINBOW_POSSIBLE_OUTCOMES,
  RAINBOW_YOU_RECEIVE,
  SEPOLIA_BANNER,
  WHITE_BOX_PRODUCT_LINE,
  WHITE_BOX_RECEIPT_LANGUAGE,
  WHITE_PANEL_MIN_FONT_PX,
} from "./copy";
import { reviewDisclosure, reviewReceiveLine, reviewWarnings } from "./reviewModel";
import { blockingCap, capReachedCopy, gateFromSnapshot, unpausePendingCopy } from "./boxStatusRead";
import { canAdvanceFromConfigure, canConfirmReview, initialFlowState } from "./flowState";
import {
  buildSimulatedQuote,
  offerInsideBand,
  formatQuoteClock,
  quoteIsExpired,
  quoteNeedsSpot,
  quoteNeedsWarning,
  quoteRemaining,
  quoteRoute,
  QUOTE_DEMO_LABEL,
  QUOTE_TTL_SECONDS,
  SPOT_BLOCKED_LABEL,
  SPOT_LIVE_LABEL,
} from "./quoteModel";
import { parseChainlinkAnswer, SPOT_MAX_AGE_SECONDS } from "./spotPriceRead";
import { toggleNftSelection } from "./moduleModel";
import {
  CHECKERED_DEMO_LABEL,
  PURPLE_MAX_NFTS,
  PURPLE_SIMILAR_VALUE,
  RUSSIAN_ACKNOWLEDGEMENT,
  RUSSIAN_TAX_TABLE,
} from "./copy";

test("catalogue has the 15 specified boxes and withholds Yellow and Pink", () => {
  assert.equal(BOXES.length, 15);
  const ids = BOXES.map((box) => box.id);
  assert.equal(ids.includes("yellow" as never), false);
  assert.equal(ids.includes("pink" as never), false);
  assert.ok(ids.includes("rainbow"));
  assert.ok(ids.includes("white"));
});

test("Rainbow review disclosure matches spec v1.1 character-for-character", () => {
  const rainbow = BOX_BY_ID.rainbow;
  const disclosure = reviewDisclosure(rainbow);
  assert.equal(
    disclosure.youReceive,
    '??? — the output of a randomly fired box. Its deposit rules apply.',
  );
  assert.equal(disclosure.youReceive, RAINBOW_YOU_RECEIVE);
  assert.equal(
    disclosure.possibleOutcomes,
    "Possible outcomes: any other box can fire — from a 1:1 token swap (Red) to a full wallet sweep (Black).",
  );
  assert.equal(disclosure.possibleOutcomes, RAINBOW_POSSIBLE_OUTCOMES);
  assert.equal(disclosure.possibleOutputs, undefined);
  assert.equal(
    disclosure.acknowledgement,
    "I understand a random box will fire and I cannot choose it.",
  );
  assert.equal(disclosure.acknowledgement, RAINBOW_ACKNOWLEDGEMENT);
  assert.ok(reviewWarnings(rainbow).includes(RAINBOW_BLACK_SWEEP_WARNING));
  assert.equal(
    RAINBOW_BLACK_SWEEP_WARNING,
    "If Black Box fires, the sweep covers your entire wallet — not just the assets you deposited.",
  );
});

test("White verbatim panel pins the exact string and a 14px floor", () => {
  const white = BOX_BY_ID.white;
  const disclosure = reviewDisclosure(white);
  assert.ok(disclosure.verbatimPanel);
  assert.equal(disclosure.verbatimPanel.text, WHITE_BOX_RECEIPT_LANGUAGE);
  assert.equal(
    disclosure.verbatimPanel.text,
    "if you wish to generate a tax receipt or wish for further information, visit thegivingblock.com and donate directly through their platform. For anonymous fast donations without tax receipts, please proceed here",
  );
  assert.equal(disclosure.verbatimPanel.minFontPx, 14);
  assert.equal(disclosure.verbatimPanel.minFontPx, WHITE_PANEL_MIN_FONT_PX);
  assert.ok(disclosure.verbatimPanel.minFontPx >= 14);
  assert.equal(
    disclosure.verbatimPanel.productLine,
    "Donations made here are anonymous and do not generate a tax receipt.",
  );
  assert.equal(disclosure.verbatimPanel.productLine, WHITE_BOX_PRODUCT_LINE);
  assert.equal(white.demo.eyebrow, "DONATION COMPLETE");
  assert.equal(
    white.acknowledgement,
    "I understand this donation is anonymous and I will not receive a tax receipt.",
  );
});

test("Sepolia banner copy is the exact non-dismissible string", () => {
  assert.equal(SEPOLIA_BANNER, "Sepolia testnet demo — never send real funds.");
});

test("pause and cap gates follow MysteryBoxBase view rules", () => {
  const open = {
    paused: false,
    unpauseReleaseAt: 0,
    blockingCap: null,
  };
  assert.deepEqual(gateFromSnapshot(open, 1_700_000_000), {
    gate: "none",
    capKind: null,
    notice: null,
  });

  assert.equal(
    gateFromSnapshot({ ...open, paused: true }, 1_700_000_000).notice,
    "This box is paused by the guardian. No new deposits.",
  );

  const pending = gateFromSnapshot(
    { ...open, paused: true, unpauseReleaseAt: 1_700_086_400 },
    1_700_000_000,
  );
  assert.equal(pending.gate, "paused");
  assert.equal(
    pending.notice,
    unpausePendingCopy(1_700_086_400),
  );
  assert.match(pending.notice ?? "", /^Paused\. Unpause is timelocked until /);

  const caps = {
    depositUsd1e8: BigInt(200),
    perTransactionCap: BigInt(100),
    perWalletCap: BigInt(0),
    totalValueAtRiskCap: BigInt(0),
    totalValueAtRisk: BigInt(0),
    walletDeposited: BigInt(0),
  };
  assert.equal(blockingCap(caps), "tx");
  assert.equal(
    blockingCap({
      ...caps,
      perTransactionCap: BigInt(0),
      totalValueAtRiskCap: BigInt(150),
      totalValueAtRisk: BigInt(0),
    }),
    "var",
  );
  assert.equal(
    blockingCap({
      ...caps,
      perTransactionCap: BigInt(0),
      perWalletCap: BigInt(250),
      walletDeposited: BigInt(100),
    }),
    "wallet",
  );
  assert.equal(blockingCap({ ...caps, perTransactionCap: BigInt(0) }), null);
  assert.equal(
    capReachedCopy("var"),
    "This box has reached its VaR cap. Try a smaller amount or another box.",
  );
  assert.equal(
    capReachedCopy("wallet"),
    "This box has reached its wallet cap. Try a smaller amount or another box.",
  );
});

test("Purple, Checkered, and Russian Flag modules gate review without a broadcast", () => {
  const purple = initialFlowState(BOX_BY_ID.purple);
  assert.equal(canAdvanceFromConfigure(BOX_BY_ID.purple, purple), false);
  const picked = {
    ...purple,
    selectedNfts: toggleNftSelection(toggleNftSelection([], "harold-4821"), "punks-912"),
  };
  assert.equal(canAdvanceFromConfigure(BOX_BY_ID.purple, picked), true);
  const capped = { ...purple, selectedNfts: ["a", "b", "c", "d", "e"] };
  assert.equal(toggleNftSelection(capped.selectedNfts, "extra").length, PURPLE_MAX_NFTS);
  const alt = {
    ...purple,
    toggles: { ...purple.toggles, mode: "alt-to-nft" },
    rows: [{ token: "USDC", amount: "0" }],
  };
  assert.equal(canAdvanceFromConfigure(BOX_BY_ID.purple, alt), false);
  assert.equal(
    canAdvanceFromConfigure(BOX_BY_ID.purple, {
      ...alt,
      rows: [{ token: "USDC", amount: "25" }],
    }),
    true,
  );
  assert.ok(reviewWarnings(BOX_BY_ID.purple).includes(PURPLE_SIMILAR_VALUE));

  const checkered = initialFlowState(BOX_BY_ID.checkered);
  assert.equal(canAdvanceFromConfigure(BOX_BY_ID.checkered, checkered), false);
  assert.equal(
    canAdvanceFromConfigure(BOX_BY_ID.checkered, {
      ...checkered,
      matchPhase: "waiting",
    }),
    false,
  );
  assert.equal(
    canAdvanceFromConfigure(BOX_BY_ID.checkered, {
      ...checkered,
      matchPhase: "matched",
      matchAccepted: true,
    }),
    true,
  );
  assert.equal(CHECKERED_DEMO_LABEL, "demo simulator");
  assert.equal(
    BOX_BY_ID.checkered.acknowledgement,
    "I understand I may receive less value and there are no takebacks.",
  );
  assert.equal(reviewDisclosure(BOX_BY_ID.checkered).irreversibleHeading, "THIS CANNOT BE UNDONE");

  const russian = reviewDisclosure(BOX_BY_ID["russian-flag"]);
  assert.equal(russian.taxLine, RUSSIAN_TAX_TABLE);
  assert.equal(russian.taxLine, "PnL < 2.4% → 13% · 2.4%–50% → 15% · > 50% → 22%.");
  assert.equal(russian.acknowledgement, RUSSIAN_ACKNOWLEDGEMENT);
  assert.equal(russian.irreversibleHeading, "THIS CANNOT BE UNDONE");
  assert.match(russian.positionNote ?? "", /24 hours/);
  assert.equal(BOX_BY_ID["russian-flag"].demo.eyebrow, "POSITION OPEN");
});

test("simulated quote expires at 60s and warns inside 30s", () => {
  const issuedAt = 1_700_000_000_000;
  assert.equal(QUOTE_TTL_SECONDS, 60);
  assert.equal(quoteRemaining(issuedAt, issuedAt + 29_000), 31);
  assert.equal(quoteNeedsWarning(31), false);
  assert.equal(quoteRemaining(issuedAt, issuedAt + 30_000), 30);
  assert.equal(quoteNeedsWarning(30), true);
  assert.equal(quoteRemaining(issuedAt, issuedAt + 60_000), 0);
  assert.equal(quoteIsExpired(0), true);
  assert.equal(formatQuoteClock(47), "00:47");

  const red = initialFlowState(BOX_BY_ID.red);
  red.quoteIssuedAt = issuedAt;
  const fresh = buildSimulatedQuote(BOX_BY_ID.red, red, issuedAt + 1_000);
  assert.equal(fresh.expired, false);
  assert.match(fresh.route, /native/i);
  assert.match(fresh.networkFee, /5% premium/);
  assert.match(fresh.platformFee, /5% of output/);
  assert.match(fresh.label, /Simulated quote/);

  const cross = {
    ...red,
    toggles: { ...red.toggles, route: "cross-chain" },
  };
  assert.match(quoteRoute(BOX_BY_ID.red, cross.toggles), /Axelar/);
  assert.equal(canAdvanceFromConfigure(BOX_BY_ID.red, red, true), false);
  assert.equal(canConfirmReview(BOX_BY_ID.red, { ...red, acknowledged: true }, true), false);
  assert.equal(canAdvanceFromConfigure(BOX_BY_ID.red, red, false), true);

  const pending = buildSimulatedQuote(BOX_BY_ID.red, red, issuedAt, { source: "fallback" });
  assert.equal(pending.spotBlocked, true);
  assert.equal(pending.label, SPOT_BLOCKED_LABEL);
  assert.equal(quoteNeedsSpot(BOX_BY_ID.red, red), true);

  const live = buildSimulatedQuote(BOX_BY_ID.red, red, issuedAt, {
    source: "chainlink",
    prices: { ETH: 2500, USDC: 1 },
    note: "Sepolia Chainlink spot · 1 feed",
  });
  assert.equal(live.spotBlocked, false);
  assert.equal(live.outputBlocked, false);
  assert.equal(live.label, SPOT_LIVE_LABEL);
  assert.match(live.depositUsd, /\$125\.00/);
  assert.match(live.estimatedReceive, /Catalogue preview/);
  assert.match(live.outputNote, /not a live pool read/);
  assert.equal(QUOTE_DEMO_LABEL.includes("GMX"), true);

  const blue = initialFlowState(BOX_BY_ID.blue);
  blue.quoteIssuedAt = issuedAt;
  const blueLive = buildSimulatedQuote(BOX_BY_ID.blue, blue, issuedAt, {
    source: "chainlink",
    prices: { ETH: 2000, USDC: 1 },
  });
  assert.equal(blueLive.outputBlocked, false);
  assert.match(blueLive.estimatedReceive, /\$100\.00 offer/);
  assert.match(blueLive.outputNote, /not a pool fill/);
  assert.equal(offerInsideBand(100, 101), true);
  assert.equal(offerInsideBand(100, 102), false);

  const green = initialFlowState(BOX_BY_ID.green);
  green.quoteIssuedAt = issuedAt;
  const greenLive = buildSimulatedQuote(BOX_BY_ID.green, green, issuedAt, {
    source: "chainlink",
    prices: { ETH: 2000, USDC: 1 },
  });
  assert.match(greenLive.estimatedReceive, /\$95\.00 in screened tokens/);
  assert.match(greenLive.outputNote, /not a pool quote/);

  const orange = initialFlowState(BOX_BY_ID.orange);
  orange.quoteIssuedAt = issuedAt;
  const orangeLive = buildSimulatedQuote(BOX_BY_ID.orange, orange, issuedAt, {
    source: "chainlink",
    prices: { ETH: 2000, WBTC: 80000, USDC: 1 },
  });
  assert.equal(orangeLive.outputBlocked, false);
  assert.match(orangeLive.estimatedReceive, /\$95\.00 in WBTC/);
  assert.match(orangeLive.outputNote, /not a pool quote/);
  assert.equal(reviewReceiveLine(BOX_BY_ID.orange, orangeLive), orangeLive.estimatedReceive);
  assert.match(reviewReceiveLine(BOX_BY_ID.red, live), /Catalogue preview/);
  assert.equal(
    reviewReceiveLine(BOX_BY_ID.purple, orangeLive, "NFTs of similar value"),
    "NFTs of similar value",
  );
  assert.equal(orangeLive.label.includes("pool quote"), true);

  const orangeBlocked = buildSimulatedQuote(BOX_BY_ID.orange, orange, issuedAt, {
    source: "error",
    prices: { USDC: 1 },
  });
  assert.equal(orangeBlocked.outputBlocked, true);
  assert.equal(orangeBlocked.estimatedReceive, "Spot read required");

  const mystery = buildSimulatedQuote(BOX_BY_ID.mystery, red, issuedAt, {
    source: "chainlink",
    prices: { ETH: 2000, USDC: 1 },
  });
  assert.match(mystery.estimatedReceive, /random output/);
  assert.match(reviewReceiveLine(BOX_BY_ID.mystery, mystery), /random/);
  assert.equal(mystery.outputBlocked, false);

  const now = 1_700_000_000;
  assert.equal(parseChainlinkAnswer(BigInt(2500_00000000), 8, BigInt(now - 60), now), 2500);
  assert.equal(parseChainlinkAnswer(BigInt(0), 8, BigInt(now), now), null);
  assert.equal(
    parseChainlinkAnswer(BigInt(2500_00000000), 8, BigInt(now - SPOT_MAX_AGE_SECONDS - 1), now),
    null,
  );
});

test("Red, Purple, and Rainbow one-liners use the spec em dash", () => {
  assert.match(BOX_BY_ID.red.oneLine, /—/);
  assert.match(BOX_BY_ID.purple.oneLine, /—/);
  assert.match(BOX_BY_ID.rainbow.oneLine, /—/);
  assert.equal(
    BOX_BY_ID.diamond.oneLine,
    "Dollar-for-dollar into sub-$10M coins, filled over 24 hours.",
  );
});
