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
const home = readFileSync(join(root, "src/app/HomeClient.tsx"), "utf8");
const review = readFileSync(join(root, "src/components/boxFlows/reviewModel.ts"), "utf8");
const result = readFileSync(join(root, "src/components/boxFlows/ResultScreen.tsx"), "utf8");
const panel = readFileSync(join(root, "src/components/boxFlows/WhiteVerbatimPanel.tsx"), "utf8");
const app = readFileSync(join(root, "src/components/boxFlows/BoxFlowApp.tsx"), "utf8");
const flow = readFileSync(join(root, "src/components/boxFlows/flowState.ts"), "utf8");
const prototype = readFileSync(
  join(root, "src/components/design/boxFlows/BoxFlowPrototype.tsx"),
  "utf8",
);

const WHITE =
  "if you wish to generate a tax receipt or wish for further information, visit thegivingblock.com and donate directly through their platform. For anonymous fast donations without tax receipts, please proceed here";
const RAINBOW_RECEIVE =
  '??? — the output of a randomly fired box. Its deposit rules apply.';
const RAINBOW_OUTCOMES =
  "Possible outcomes: any other box can fire — from a 1:1 token swap (Red) to Black.";
const RAINBOW_SWEEP =
  "The deposit amount in that transaction can be lost in full and cannot be undone. Do not deposit assets you want to keep.";
const BLACK_ONE_LINE =
  "Deposit the full balance of one token into the black hole. Keep a Harold NFT as the receipt.";
const BLACK_DETAIL =
  "Rage quit. Your deposit of a single token — up to its full balance — goes to a one-time deposit address, valued in USD, and on to the dev black hole. You receive a Hide The Pain Harold NFT with the USD value printed in the corner. This is irreversible and zeroes the deposited token's balance.";
const BLACK_LEGACY_CARD =
  "Rage quit. Throw a token's full balance into a black hole and zero out that token's balance. Receive a minted Hide The Pain Harold NFT displaying the dollar value sent.";
const BLACK_ACK =
  "I understand this deposit is irreversible and will zero the deposited token's balance.";
const FORBIDDEN = [
  "full wallet sweep",
  "sweeps the entire wallet",
  "covers your entire wallet",
  "entire wallet",
  "Every token in the connected wallet",
  "zeroes the wallet's balances",
  "zero my balances",
  "zero out your balances",
];
const RAINBOW_ACK = "I understand a random box will fire and I cannot choose it.";
const BANNER = "Sepolia testnet demo — never send real funds.";
const DIAMOND = "Dollar-for-dollar into sub-$10M coins, filled over 24 hours.";

assert.ok(catalog.includes(WHITE), "catalog missing White verbatim string");
assert.ok(copy.includes(WHITE), "copy.ts missing White verbatim string");
assert.ok(catalog.includes(RAINBOW_RECEIVE) === false);
assert.ok(copy.includes(RAINBOW_RECEIVE));
assert.ok(copy.includes(RAINBOW_OUTCOMES));
assert.ok(copy.includes(RAINBOW_SWEEP));
assert.ok(catalog.includes(RAINBOW_SWEEP));
assert.ok(copy.includes(RAINBOW_ACK));
for (const [file, text] of [
  ["catalog.ts", catalog],
  ["copy.ts", copy],
  ["HomeClient.tsx", home],
  ["BoxFlowPrototype.tsx", prototype],
]) {
  for (const phrase of FORBIDDEN) {
    assert.equal(
      text.toLowerCase().includes(phrase.toLowerCase()),
      false,
      `${file} still publishes "${phrase}"`,
    );
  }
}
assert.ok(prototype.includes("All supported EVM chains"));
assert.ok(catalog.includes(BLACK_ONE_LINE), "catalog.ts missing Black oneLine");
assert.ok(catalog.includes(BLACK_DETAIL), "catalog.ts missing Black detail");
assert.ok(catalog.includes(BLACK_ACK), "catalog.ts missing Black acknowledgement");
assert.ok(home.includes(BLACK_LEGACY_CARD), "HomeClient.tsx missing Black card description");
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
assert.ok(review.includes("reviewReceiveLine"));
assert.ok(review.includes('box.id === "rainbow"'));
assert.ok(review.includes("possibleOutputs"));
assert.ok(app.includes("SepoliaBanner"));
assert.ok(flow.includes("does not request a signature"));
assert.ok(app.includes("signBlockedReason"));
assert.ok(app.includes("signSummaryLine"));
assert.equal(app.includes("0.05 ETH →"), false);
assert.ok(app.includes("HIDE"));
assert.ok(app.includes("finalityHidden"));
assert.ok(app.includes("offerAccepted"));
assert.ok(app.includes("greenEligible"));
assert.ok(app.includes("ResultScreen"));
assert.ok(app.includes("FinalityOverlay"));
assert.ok(result.includes("ON COINGECKO"));
assert.ok(result.includes("ON DEXSCREENER"));
assert.ok(result.includes("VIEW TRANSACTION"));
assert.ok(result.includes("VALUE AT SWEEP"));
assert.ok(review.includes("resultSweepValue"));
assert.ok(review.includes("resultAssetRows"));
assert.ok(review.includes("resultPositionEntry"));
assert.ok(result.includes("resultSweepValue"));
assert.ok(result.includes("resultAssetRows"));
assert.ok(result.includes("resultPositionEntry"));
assert.equal(result.includes("$1,000.00 USDC"), false);
assert.ok(result.includes("RESULT_VALUE_PREVIEW"));
assert.ok(app.includes("quote={quote}"));
assert.equal(result.includes("box.demo.assets[0]?.amount"), false);
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
assert.ok(quoteModel.includes("Output value uses the same Sepolia Chainlink spot read. It is not a pool quote."));
assert.ok(quoteModel.includes("Offer value uses the same Sepolia Chainlink spot read. It is not a pool fill."));
assert.ok(quoteModel.includes('box.id === "blue"'));
assert.ok(quoteModel.includes('box.id === "green"'));
assert.ok(app.includes("blue-offer-line"));
assert.ok(app.includes("Offer needs a Sepolia spot read."));
assert.ok(quotePanel.includes('data-testid="output-note"'));
assert.ok(quoteModel.includes("outputBlocked"));
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
