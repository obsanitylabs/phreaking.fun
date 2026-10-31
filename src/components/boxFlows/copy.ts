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

/** Spec §9.1. The timestamp is appended by the status reader. */
export const UNPAUSE_PENDING_PREFIX = "Paused. Unpause is timelocked until ";

export const CAP_REACHED_COPY =
  "This box has reached its tx cap. Try a smaller amount or another box.";

export const WRONG_NETWORK_COPY = "WRONG NETWORK — SWITCH TO SEPOLIA";

export const SIGNATURE_CANCELLED = "Signature cancelled. Nothing was sent.";

export const CONFIRM_FINE_PRINT =
  "By confirming, you authorise the transaction above. Token values can change before execution.";

export const FINALITY_KEEP_OPEN =
  "Keep this tab open. You can hide this panel; the transaction will continue.";

export const TAKING_LONGER = "Taking longer than usual";

export const REVERTED_COPY = "Transaction reverted. Your deposit was not taken.";

export const GREEN_INELIGIBLE_COPY =
  "This token does not meet the recycler criteria.";

export const BLUE_BAND_COPY = "Slippage band ±1%. Accept the offer to continue.";

/** Spec §6.3.1 Purple. The band is estimated, not guaranteed. */
export const PURPLE_SIMILAR_VALUE =
  "Similar value is estimated within ±10% and is not guaranteed.";

export const PURPLE_FLOOR_SWEEP =
  "May sweep Black Box Harold NFTs first when available.";

export const PURPLE_MAX_NFTS = 5;

/** Spec §6.3.1 Checkered. Sepolia has no counterparty pool (open question 6). */
export const CHECKERED_DEMO_LABEL = "demo simulator";

export const CHECKERED_WAITING =
  "WAITING FOR COUNTERPARTY";

export const CHECKERED_ACCEPT_WINDOW =
  "Matched. Accept within 30 seconds. Declining returns you to the queue.";

/** Spec §6.3.1 Russian Flag. Tax table is disclosure, not a live GMX quote. */
export const RUSSIAN_BASKET = "ETH, SOL, LINK, AAVE, TON, XMR";

export const RUSSIAN_SHORT_CHANCE = "1 in 6 chance the position goes short.";

export const RUSSIAN_TAX_TABLE =
  "PnL < 2.4% → 13% · 2.4%–50% → 15% · > 50% → 22%.";

export const RUSSIAN_ACKNOWLEDGEMENT =
  "I understand my funds are locked for 24 hours and profit is taxed.";

export const RUSSIAN_RETURN_NOTE =
  "You will return to close the position after 24 hours.";

export const IRREVERSIBLE_HEADING = "THIS CANNOT BE UNDONE";
