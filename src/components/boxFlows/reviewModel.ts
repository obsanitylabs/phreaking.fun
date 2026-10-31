import type { BoxDefinition } from "@/components/design/boxFlows/types";
import type { SimulatedQuote } from "./quoteModel";
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

export function reviewWarnings(box: BoxDefinition): string[] {
  const disclosure = reviewDisclosure(box);
  const merged = [...box.warnings];
  for (const warning of disclosure.extraWarnings) {
    if (!merged.includes(warning)) merged.push(warning);
  }
  return merged;
}
