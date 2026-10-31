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
import { reviewDisclosure, reviewWarnings } from "./reviewModel";
import { blockingCap, capReachedCopy, gateFromSnapshot, unpausePendingCopy } from "./boxStatusRead";

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

test("Red, Purple, and Rainbow one-liners use the spec em dash", () => {
  assert.match(BOX_BY_ID.red.oneLine, /—/);
  assert.match(BOX_BY_ID.purple.oneLine, /—/);
  assert.match(BOX_BY_ID.rainbow.oneLine, /—/);
  assert.equal(
    BOX_BY_ID.diamond.oneLine,
    "Dollar-for-dollar into sub-$10M coins, filled over 24 hours.",
  );
});
