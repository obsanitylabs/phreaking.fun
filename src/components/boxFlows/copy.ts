/**
 * Trust-critical copy pinned to design spec v1.1 (OBS-177).
 * Character-exact strings live here so review screens and tests share one source.
 */

export const SEPOLIA_BANNER =
  "Sepolia testnet demo — never send real funds.";

export const SEPOLIA_CHAIN_ID = 11155111;

export const RAINBOW_YOU_RECEIVE =
  "??? — the output of a randomly fired box. Its deposit rules apply.";

export const RAINBOW_POSSIBLE_OUTCOMES =
  "Possible outcomes: any other box can fire — from a 1:1 token swap (Red) to a full wallet sweep (Black).";

export const RAINBOW_BLACK_SWEEP_WARNING =
  "If Black Box fires, the sweep covers your entire wallet — not just the assets you deposited.";

export const RAINBOW_ACKNOWLEDGEMENT =
  "I understand a random box will fire and I cannot choose it.";

export const MYSTERY_YOU_RECEIVE = "??? — one token from the active pool";

export const MYSTERY_ACKNOWLEDGEMENT =
  "I understand the output is random and cannot be chosen.";

export const WHITE_BOX_RECEIPT_LANGUAGE =
  "if you wish to generate a tax receipt or wish for further information, visit thegivingblock.com and donate directly through their platform. For anonymous fast donations without tax receipts, please proceed here";

export const WHITE_BOX_PRODUCT_LINE =
  "Donations made here are anonymous and do not generate a tax receipt.";

export const WHITE_BOX_ACKNOWLEDGEMENT =
  "I understand this donation is anonymous and I will not receive a tax receipt.";

/** Spec §6.4: the verbatim panel renders at ≥14px. Pin the floor so tests can fail a shrink. */
export const WHITE_PANEL_MIN_FONT_PX = 14;

export const STAKING_LOCKED_COPY = "STAKING IS NOT LIVE ON SEPOLIA";

export const PAUSED_COPY =
  "This box is paused by the guardian. No new deposits.";

export const CAP_REACHED_COPY =
  "This box has reached its tx cap. Try a smaller amount or another box.";

export const WRONG_NETWORK_COPY = "WRONG NETWORK — SWITCH TO SEPOLIA";

export const SIGNATURE_CANCELLED = "Signature cancelled. Nothing was sent.";

export const CONFIRM_FINE_PRINT =
  "By confirming, you authorise the transaction above. Token values can change before execution.";
