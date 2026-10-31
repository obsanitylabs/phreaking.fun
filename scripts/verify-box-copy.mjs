/**
 * Pins trust-critical box UX copy to spec v1.1 without a test runner.
 * Fails the process if Rainbow disclosure or the White verbatim string drifts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const catalog = readFileSync(join(root, "src/components/design/boxFlows/catalog.ts"), "utf8");
const copy = readFileSync(join(root, "src/components/boxFlows/copy.ts"), "utf8");
const review = readFileSync(join(root, "src/components/boxFlows/reviewModel.ts"), "utf8");
const panel = readFileSync(join(root, "src/components/boxFlows/WhiteVerbatimPanel.tsx"), "utf8");
const app = readFileSync(join(root, "src/components/boxFlows/BoxFlowApp.tsx"), "utf8");
const flow = readFileSync(join(root, "src/components/boxFlows/flowState.ts"), "utf8");

const WHITE =
  "if you wish to generate a tax receipt or wish for further information, visit thegivingblock.com and donate directly through their platform. For anonymous fast donations without tax receipts, please proceed here";
const RAINBOW_RECEIVE =
  '??? — the output of a randomly fired box. Its deposit rules apply.';
const RAINBOW_OUTCOMES =
  "Possible outcomes: any other box can fire — from a 1:1 token swap (Red) to a full wallet sweep (Black).";
const RAINBOW_SWEEP =
  "If Black Box fires, the sweep covers your entire wallet — not just the assets you deposited.";
const RAINBOW_ACK = "I understand a random box will fire and I cannot choose it.";
const BANNER = "Sepolia testnet demo — never send real funds.";
const DIAMOND = "Dollar-for-dollar into sub-$10M coins, filled over 24 hours.";

assert.ok(catalog.includes(WHITE), "catalog missing White verbatim string");
assert.ok(copy.includes(WHITE), "copy.ts missing White verbatim string");
assert.ok(catalog.includes(RAINBOW_RECEIVE) === false);
assert.ok(copy.includes(RAINBOW_RECEIVE));
assert.ok(copy.includes(RAINBOW_OUTCOMES));
assert.ok(copy.includes(RAINBOW_SWEEP));
assert.ok(copy.includes(RAINBOW_ACK));
assert.ok(copy.includes(BANNER));
assert.ok(catalog.includes(DIAMOND));
assert.ok(catalog.includes('eyebrow: "DONATION COMPLETE"'));
assert.equal(catalog.includes("yellow"), false);
assert.equal(catalog.includes("pink"), false);

const ids = [...catalog.matchAll(/id: "([a-z0-9-]+)"/g)].map((match) => match[1]);
const boxIds = ids.filter((id) =>
  [
    "mystery",
    "red",
    "blue",
    "green",
    "orange",
    "purple",
    "white",
    "black",
    "rainbow",
    "checkered",
    "russian-flag",
    "silver",
    "gold",
    "diamond",
    "coin-gatcha",
  ].includes(id),
);
assert.equal(boxIds.length, 15, `expected 15 boxes, found ${boxIds.length}`);

assert.match(copy, /WHITE_PANEL_MIN_FONT_PX = 14/);
assert.match(panel, /fontSize: `\$\{minFontPx\}px`/);
assert.match(panel, /data-min-font-px=\{minFontPx\}/);
assert.match(panel, /data-testid="white-verbatim-text"/);
assert.ok(review.includes('box.id === "rainbow"'));
assert.ok(review.includes("possibleOutputs"));
assert.ok(app.includes("SepoliaBanner"));
assert.ok(flow.includes("does not request a signature"));
assert.ok(app.includes("signBlockedReason"));
assert.ok(app.includes("HIDE"));
assert.ok(app.includes("finalityHidden"));
assert.ok(app.includes("offerAccepted"));
assert.ok(app.includes("greenEligible"));
assert.ok(app.includes("ResultScreen"));
assert.ok(app.includes("FinalityOverlay"));
const result = readFileSync(join(root, "src/components/boxFlows/ResultScreen.tsx"), "utf8");
assert.ok(result.includes("ON COINGECKO"));
assert.ok(result.includes("ON DEXSCREENER"));
assert.ok(result.includes("VIEW TRANSACTION"));
assert.ok(result.includes("VALUE AT SWEEP"));
const flowText = readFileSync(join(root, "src/components/boxFlows/flowState.ts"), "utf8");
assert.ok(flowText.includes("https://www.coingecko.com/en/search?query="));
assert.ok(flowText.includes("https://dexscreener.com/search?q="));
assert.ok(flowText.includes("https://sepolia.etherscan.io/"));
assert.ok(!result.includes('href="#"'));
assert.ok(!result.includes("javascript:"));

const statusRead = readFileSync(join(root, "src/components/boxFlows/boxStatusRead.ts"), "utf8");
assert.ok(copy.includes("This box is paused by the guardian. No new deposits."));
assert.ok(copy.includes("Paused. Unpause is timelocked until "));
assert.ok(copy.includes("This box has reached its tx cap. Try a smaller amount or another box."));
assert.ok(statusRead.includes("This box has reached its ${label} cap."));
assert.ok(statusRead.includes('return "tx"'));
assert.ok(statusRead.includes('return "var"'));
assert.ok(statusRead.includes('return "wallet"'));
assert.ok(statusRead.includes("stateMutability") === false);
assert.ok(app.includes("readBoxStatus"));
assert.ok(app.includes("gateFromSnapshot"));
assert.ok(!app.includes("walletClient"));
assert.ok(!app.includes("writeContract"));
assert.ok(app.includes("PurpleModule"));
assert.ok(app.includes("CheckeredModule"));
assert.ok(app.includes("RussianFlagModule"));
assert.ok(copy.includes("Similar value is estimated within ±10% and is not guaranteed."));
assert.ok(copy.includes("demo simulator"));
assert.ok(copy.includes("PnL < 2.4% → 13% · 2.4%–50% → 15% · > 50% → 22%."));
assert.ok(flow.includes('box.id === "checkered"'));
assert.ok(flow.includes("selectedNfts.length > 0"));
assert.ok(copy.includes("Quote expires in 30s"));
assert.ok(copy.includes("Refresh quote"));
assert.ok(app.includes("QuotePanel"));
assert.ok(app.includes("refresh-quote") === false);
const quotePanel = readFileSync(join(root, "src/components/boxFlows/QuotePanel.tsx"), "utf8");
const quoteModel = readFileSync(join(root, "src/components/boxFlows/quoteModel.ts"), "utf8");
assert.ok(quotePanel.includes('data-testid="refresh-quote"'));
assert.ok(quoteModel.includes("Simulated route — no counterparty pool or GMX position."));
assert.ok(quoteModel.includes("Deposit value uses a Sepolia Chainlink spot read."));
assert.ok(quoteModel.includes("QUOTE_TTL_SECONDS = 60"));
assert.ok(quoteModel.includes("QUOTE_WARNING_SECONDS = 30"));
assert.ok(app.includes("quoteExpired"));
assert.ok(app.includes("readSepoliaSpotPrices"));
assert.ok(app.includes("spotBlocked"));
assert.ok(!app.includes("writeContract"));
const spot = readFileSync(join(root, "src/components/boxFlows/spotPriceRead.ts"), "utf8");
assert.ok(spot.includes("latestRoundData"));
assert.ok(spot.includes("0x694AA1769357215DE4FAC081bf1f309aDC325306"));
assert.ok(!spot.includes("writeContract"));

console.log("box copy snapshot ok: 15 boxes, Rainbow disclosure, White 14px panel, pause/cap reads, modules, spot quote");
