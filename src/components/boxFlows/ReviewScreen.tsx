"use client";

import { ShieldAlert } from "lucide-react";
import type { BoxDefinition } from "@/components/design/boxFlows/types";
import { CONFIRM_FINE_PRINT } from "./copy";
import { QuotePanel } from "./QuotePanel";
import type { SimulatedQuote } from "./quoteModel";
import { reviewDisclosure, reviewReceiveLine, reviewWarnings } from "./reviewModel";
import { WhiteVerbatimPanel } from "./WhiteVerbatimPanel";

export interface ReviewAsset {
  symbol: string;
  amount: string;
  usd: string;
}

interface ReviewScreenProps {
  box: BoxDefinition;
  sendRows: ReviewAsset[];
  route: string;
  charityLabel?: string;
  acknowledged: boolean;
  onAcknowledge: (value: boolean) => void;
  ackError?: boolean;
  youReceiveOverride?: string;
  quote?: SimulatedQuote | null;
  onRefreshQuote?: () => void;
}

export function ReviewScreen({
  box,
  sendRows,
  route,
  charityLabel,
  acknowledged,
  onAcknowledge,
  ackError,
  youReceiveOverride,
  quote,
  onRefreshQuote,
}: ReviewScreenProps) {
  const disclosure = reviewDisclosure(box);
  const warnings = reviewWarnings(box);
  const needsAck = Boolean(disclosure.acknowledgement);

  return (
    <div className="space-y-4" data-testid={`review-${box.id}`}>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          You send
        </p>
        <div className="mt-1 divide-y divide-white/10 border border-white/15">
          {sendRows.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-white/40">No assets selected.</p>
          ) : (
            sendRows.map((asset) => (
              <div
                key={`${asset.symbol}-${asset.amount}`}
                className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
              >
                <span className="text-white">
                  {asset.amount} {asset.symbol}
                </span>
                <span className="text-white/50">{asset.usd}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {charityLabel && (
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Charity
          </p>
          <p className="mt-1 border border-white/15 px-3 py-2 text-xs text-white">
            {charityLabel}
          </p>
        </div>
      )}

      <div data-testid="you-receive">
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          You receive
        </p>
        <div className="mt-1 border border-white/15 px-3 py-2 text-xs">
          <p className="text-white" data-testid="you-receive-line">
            {reviewReceiveLine(box, quote, youReceiveOverride)}
          </p>
          {disclosure.similarValue && (
            <p className="mt-2 text-[12px] text-white/70" data-testid="similar-value">
              {disclosure.similarValue}
            </p>
          )}
          {disclosure.taxLine && (
            <p className="mt-2 text-[12px] text-terminal-orange" data-testid="tax-line">
              {disclosure.taxLine}
            </p>
          )}
          {disclosure.positionNote && (
            <p className="mt-1 text-[12px] text-white/70" data-testid="position-note">
              {disclosure.positionNote}
            </p>
          )}
          {disclosure.possibleOutcomes && (
            <p
              className="mt-2 text-[12px] leading-relaxed text-white/70"
              data-testid="possible-outcomes"
            >
              {disclosure.possibleOutcomes}
            </p>
          )}
          {disclosure.possibleOutputs && (
            <p className="mt-1 text-[10px] text-white/40" data-testid="possible-outputs">
              {disclosure.possibleOutputs}
            </p>
          )}
        </div>
      </div>

      {quote && onRefreshQuote ? (
        <QuotePanel quote={quote} onRefresh={onRefreshQuote} />
      ) : (
        <dl className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">ROUTE</dt>
            <dd className="text-right text-white/70">{route}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">NETWORK FEE</dt>
            <dd className="text-right text-white/70">0.0012 ETH + 5% premium</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">PLATFORM FEE</dt>
            <dd className="text-right text-white/70">5% of output</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">NETWORK</dt>
            <dd className="text-right text-white/70">Sepolia (11155111)</dd>
          </div>
        </dl>
      )}

      <div className="border border-terminal-orange/50 bg-[#1A1206] p-3">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-terminal-orange">
          <ShieldAlert size={14} aria-hidden="true" /> Risks
        </p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] font-bold text-terminal-orange">
          {warnings.map((warning) => (
            <li key={warning} data-testid="risk-line">
              {warning}
            </li>
          ))}
        </ul>
      </div>

      {disclosure.verbatimPanel && (
        <WhiteVerbatimPanel
          text={disclosure.verbatimPanel.text}
          productLine={disclosure.verbatimPanel.productLine}
          minFontPx={disclosure.verbatimPanel.minFontPx}
        />
      )}

      {disclosure.irreversibleHeading && (
        <p
          className="border border-terminal-orange bg-[#1A1206] px-3 py-2 text-[12px] font-bold uppercase tracking-widest text-terminal-orange"
          data-testid="irreversible-heading"
        >
          {disclosure.irreversibleHeading}
        </p>
      )}

      {needsAck && (
        <label className="flex items-start gap-3 border border-terminal-orange/60 bg-[#1A1206] p-3 text-[12px] text-white/90">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => onAcknowledge(event.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[#FD9C26] focus:outline-none focus:ring-2 focus:ring-white"
            data-testid="ack-checkbox"
          />
          <span>
            {disclosure.acknowledgement}
            {ackError && (
              <span className="mt-1 block font-bold text-terminal-orange" role="alert">
                Acknowledge the warning to continue.
              </span>
            )}
          </span>
        </label>
      )}

      <p className="text-[10px] leading-relaxed text-white/40">{CONFIRM_FINE_PRINT}</p>
    </div>
  );
}
