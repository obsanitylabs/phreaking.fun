"use client";

import type { SimulatedQuote } from "./quoteModel";
import { formatQuoteClock, QUOTE_DEMO_LABEL, QUOTE_EXPIRED_COPY, QUOTE_EXPIRES_SOON, REFRESH_QUOTE_LABEL } from "./quoteModel";

interface QuotePanelProps {
  quote: SimulatedQuote;
  onRefresh: () => void;
}

export function QuotePanel({ quote, onRefresh }: QuotePanelProps) {
  const freshness = quote.expired
    ? QUOTE_EXPIRED_COPY
    : quote.warning
      ? `${QUOTE_EXPIRES_SOON} · ${formatQuoteClock(quote.remainingSeconds)}`
      : formatQuoteClock(quote.remainingSeconds);

  return (
    <div
      className="border border-white/15 bg-white/[0.02] p-3 text-[11px]"
      data-testid="quote-panel"
      data-expired={quote.expired ? "true" : "false"}
      data-revision={quote.revision}
    >
      <p className="text-[10px] uppercase tracking-widest text-terminal-orange" data-testid="quote-demo-label">
        {QUOTE_DEMO_LABEL}
      </p>
      <dl className="mt-2 space-y-1">
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">EST. RECEIVE</dt>
          <dd className="text-right text-white" data-testid="est-receive">
            {quote.estimatedReceive}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">DEPOSIT VALUE</dt>
          <dd className="text-right text-white">{quote.depositUsd}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">ROUTE</dt>
          <dd className="text-right text-white/70" data-testid="quote-route">
            {quote.route}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">NETWORK FEE</dt>
          <dd className="text-right text-white/70">{quote.networkFee}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">PLATFORM FEE</dt>
          <dd className="text-right text-white/70">{quote.platformFee}</dd>
        </div>
        {quote.boxFee && (
          <div className="flex justify-between gap-3">
            <dt className="text-white/40">BOX FEE</dt>
            <dd className="text-right text-white/70">{quote.boxFee}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-white/40">QUOTE EXPIRES</dt>
          <dd
            className={`text-right ${quote.warning || quote.expired ? "text-terminal-orange" : "text-white/70"}`}
            data-testid="quote-expires"
            aria-live="polite"
          >
            {freshness}
          </dd>
        </div>
      </dl>
      {(quote.warning || quote.expired) && (
        <button
          type="button"
          data-testid="refresh-quote"
          onClick={onRefresh}
          className="mt-3 min-h-11 w-full border border-terminal-orange px-3 py-2 text-[11px] uppercase tracking-widest text-terminal-orange focus:outline-none focus:ring-2 focus:ring-white"
        >
          {REFRESH_QUOTE_LABEL}
        </button>
      )}
    </div>
  );
}
