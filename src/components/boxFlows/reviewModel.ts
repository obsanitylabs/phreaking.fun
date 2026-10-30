import type { BoxDefinition } from "@/components/design/boxFlows/types";
import {
  MYSTERY_ACKNOWLEDGEMENT,
  MYSTERY_YOU_RECEIVE,
  RAINBOW_ACKNOWLEDGEMENT,
  RAINBOW_BLACK_SWEEP_WARNING,
  RAINBOW_POSSIBLE_OUTCOMES,
  RAINBOW_YOU_RECEIVE,
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

export function reviewWarnings(box: BoxDefinition): string[] {
  const disclosure = reviewDisclosure(box);
  const merged = [...box.warnings];
  for (const warning of disclosure.extraWarnings) {
    if (!merged.includes(warning)) merged.push(warning);
  }
  return merged;
}
