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

test("Red, Purple, and Rainbow one-liners use the spec em dash", () => {
  assert.match(BOX_BY_ID.red.oneLine, /—/);
  assert.match(BOX_BY_ID.purple.oneLine, /—/);
  assert.match(BOX_BY_ID.rainbow.oneLine, /—/);
  assert.equal(
    BOX_BY_ID.diamond.oneLine,
    "Dollar-for-dollar into sub-$10M coins, filled over 24 hours.",
  );
});
