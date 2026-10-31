import type { BoxDefinition } from "@/components/design/boxFlows/types";
import { outputValueKind, type SimulatedQuote } from "./quoteModel";
import {
  IRREVERSIBLE_HEADING,
  MYSTERY_ACKNOWLEDGEMENT,
  MYSTERY_YOU_RECEIVE,
  PURPLE_SIMILAR_VALUE,
  RAINBOW_ACKNOWLEDGEMENT,
  RAINBOW_BLACK_SWEEP_WARNING,
  RAINBOW_POSSIBLE_OUTCOMES,
  RAINBOW_YOU_RECEIVE,
  RUSSIAN_RETURN_NOTE,
  RUSSIAN_TAX_TABLE,
  WHITE_BOX_ACKNOWLEDGEMENT,
  WHITE_BOX_PRODUCT_LINE,
  WHITE_BOX_RECEIPT_LANGUAGE,
  WHITE_PANEL_MIN_FONT_PX,
} from "./copy";

export interface ReviewDisclosure {
  youReceive: string;
  possibleOutcomes?: string;
  possibleOutputs?: string;
  extraWarnings: string[];
  acknowledgement?: string;
  irreversibleHeading?: string;
  taxLine?: string;
  positionNote?: string;
  similarValue?: string;
  verbatimPanel?: {
    text: string;
    minFontPx: number;
    productLine: string;
  };
}

/**
 * Review-screen disclosure for a box. Rainbow and White are trust-critical (spec §6.4).
 * Rainbow must not fall back to a token-list "possible outputs".
 */
export function reviewDisclosure(box: BoxDefinition): ReviewDisclosure {
  if (box.id === "rainbow") {
    return {
      youReceive: RAINBOW_YOU_RECEIVE,
      possibleOutcomes: RAINBOW_POSSIBLE_OUTCOMES,
      extraWarnings: [RAINBOW_BLACK_SWEEP_WARNING],
      acknowledgement: box.acknowledgement ?? RAINBOW_ACKNOWLEDGEMENT,
    };
  }

  if (box.id === "mystery" || box.flowKind === "random-swap") {
    return {
      youReceive: MYSTERY_YOU_RECEIVE,
      possibleOutputs: "Possible outputs: BAX · RIO · LINK · GFI · PEAR · wTHT · +12 more",
      extraWarnings: [],
      acknowledgement: box.acknowledgement ?? MYSTERY_ACKNOWLEDGEMENT,
    };
  }

  if (box.id === "purple") {
    return {
      youReceive: box.demo.assets
        .map((asset) => `${asset.amount} ${asset.symbol}`)
        .join(", "),
      extraWarnings: [PURPLE_SIMILAR_VALUE],
      similarValue: PURPLE_SIMILAR_VALUE,
    };
  }

  if (box.id === "checkered" || box.id === "black" || box.id === "russian-flag") {
    return {
      youReceive:
        box.id === "russian-flag"
          ? "POSITION OPEN — direction, entry, and a 24h countdown"
          : box.demo.assets.map((asset) => `${asset.amount} ${asset.symbol}`).join(", "),
      extraWarnings: [],
      acknowledgement: box.acknowledgement,
      irreversibleHeading:
        box.id === "black" || box.id === "checkered" || box.id === "russian-flag"
          ? IRREVERSIBLE_HEADING
          : undefined,
      taxLine: box.id === "russian-flag" ? RUSSIAN_TAX_TABLE : undefined,
      positionNote: box.id === "russian-flag" ? RUSSIAN_RETURN_NOTE : undefined,
    };
  }

  if (box.id === "white") {
    return {
      youReceive: box.demo.assets
        .map((asset) => `${asset.amount} ${asset.symbol}`)
        .join(", "),
      extraWarnings: [],
      acknowledgement: box.acknowledgement ?? WHITE_BOX_ACKNOWLEDGEMENT,
      verbatimPanel: {
        text: WHITE_BOX_RECEIPT_LANGUAGE,
        minFontPx: WHITE_PANEL_MIN_FONT_PX,
        productLine: WHITE_BOX_PRODUCT_LINE,
      },
    };
  }

  return {
    youReceive: box.demo.assets
      .map((asset) => `${asset.amount} ${asset.symbol}`)
      .join(", "),
    extraWarnings: [],
    acknowledgement: box.requiresAcknowledgement ? box.acknowledgement : undefined,
  };
}

/**
 * Review must repeat the quote the user just saw. A catalogue asset list would
 * disagree with the live spot line. Random, match, and position boxes keep
 * their disclosure copy.
 */
export function reviewReceiveLine(
  box: BoxDefinition,
  quote: SimulatedQuote | null | undefined,
  override?: string,
): string {
  if (override) return override;
  if (
    quote &&
    (quote.outputBlocked ||
      quote.outputNote.includes("not a pool") ||
      quote.outputNote.includes("not a live pool"))
  ) {
    return quote.estimatedReceive;
  }
  return reviewDisclosure(box).youReceive;
}

export interface SignSendRow {
  symbol: string;
  amount: string;
  usd: string;
}

/**
 * Spec §6.5. The signature preview repeats the quote the user just accepted.
 * It must not invent a deposit such as "0.05 ETH".
 */
export function signSummaryLine(
  box: BoxDefinition,
  quote: SimulatedQuote | null | undefined,
  sendRows: SignSendRow[],
): string {
  const send =
    sendRows.length === 0
      ? "No assets selected"
      : sendRows.map((row) => `${row.amount} ${row.symbol}`).join(" + ");
  const receive = reviewReceiveLine(box, quote);
  const value = quote?.depositUsd ? ` (${quote.depositUsd})` : "";
  return `${send}${value} → ${box.name}. You receive: ${receive}.`;
}

export function reviewWarnings(box: BoxDefinition): string[] {
  const disclosure = reviewDisclosure(box);
  const merged = [...box.warnings];
  for (const warning of disclosure.extraWarnings) {
    if (!merged.includes(warning)) merged.push(warning);
  }
  return merged;
}

export const SWEEP_VALUE_PREVIEW =
  "Sweep value is a labelled inventory preview, not a wallet read.";

export const RESULT_VALUE_PREVIEW =
  "Received value repeats the quote you just accepted. It is not a token amount or a pool fill.";

export const POSITION_ENTRY_PREVIEW =
  "Entry repeats the deposit you just accepted. No GMX position is opened.";

export interface ResultAssetRow {
  symbol: string;
  amount: string;
  usd: string;
  /** True when the row prints the accepted quote instead of a catalogue amount. */
  quoted: boolean;
}

const OUTPUT_SYMBOL: Partial<Record<BoxDefinition["id"], string>> = {
  orange: "WBTC",
  white: "USDC",
  blue: "OFFER",
  green: "SCREENED",
  purple: "NFT FLOOR",
};

/**
 * Spec §6.7. A known-output result repeats the quote the user just accepted.
 * It must not print a catalogue amount such as "1.000 WBTC / $63,120.00".
 * Token quantity stays unknown until a pool fill exists. The named output
 * token keeps its CoinGecko and Dexscreener links.
 */
export function resultAssetRows(
  box: BoxDefinition,
  quote: SimulatedQuote | null | undefined,
): ResultAssetRow[] {
  const catalogue = box.demo.assets.map((asset) => ({
    symbol: asset.symbol,
    amount: asset.amount,
    usd: asset.usd,
    quoted: false,
  }));
  if (box.resultKind === "harold-nft") return catalogue;
  if (box.resultKind === "position") {
    const entry = resultPositionEntry(quote?.depositUsd);
    return [
      {
        symbol: "POSITION",
        amount: entry.value,
        usd: entry.value,
        quoted: true,
      },
    ];
  }
  if (!quote || outputValueKind(box) !== "value") return catalogue;
  const symbol = OUTPUT_SYMBOL[box.id] ?? box.demo.assets[0]?.symbol ?? "OUTPUT";
  if (quote.outputBlocked || quote.estimatedReceive === "Spot read required") {
    return [
      {
        symbol,
        amount: "Value unavailable",
        usd: "Spot read required",
        quoted: true,
      },
    ];
  }
  return [
    {
      symbol,
      amount: "Amount pending pool fill",
      usd: quote.estimatedReceive,
      quoted: true,
    },
  ];
}

/**
 * Spec §6.7. Black prints the USD the user just reviewed on the NFT.
 * A catalogue amount such as "$1,842.60" must not replace that quote.
 * The preview never claims a broadcast happened.
 */
export function resultSweepValue(depositUsd: string | null | undefined): {
  value: string;
  note: string;
} {
  const value = depositUsd && depositUsd !== "Spot read required" ? depositUsd : "Sweep value unavailable";
  return { value, note: SWEEP_VALUE_PREVIEW };
}

/**
 * Spec §6.3. Russian Flag prints the deposit the user just accepted as entry.
 * A catalogue amount such as "$1,000.00" must not replace that quote.
 * The line never claims a GMX position was opened.
 */
export function resultPositionEntry(depositUsd: string | null | undefined): {
  value: string;
  note: string;
} {
  const value =
    depositUsd && depositUsd !== "Spot read required" ? depositUsd : "Entry unavailable";
  return { value, note: POSITION_ENTRY_PREVIEW };
}
