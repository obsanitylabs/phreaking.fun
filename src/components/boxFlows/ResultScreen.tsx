"use client";

import { Skull } from "lucide-react";
import type { BoxDefinition, DemoResult } from "@/components/design/boxFlows/types";
import { WHITE_BOX_PRODUCT_LINE } from "./copy";
import type { SimulatedQuote } from "./quoteModel";
import {
  resultAssetRows,
  resultSweepValue,
  RESULT_VALUE_PREVIEW,
  SWEEP_VALUE_PREVIEW,
} from "./reviewModel";
import {
  coingeckoSearchUrl,
  DEMO_EXPLORER_URL,
  DEMO_TX_HASH,
  dexscreenerSearchUrl,
  resultShowsTokenLinks,
} from "./flowState";

const LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center border border-white/20 px-3 py-2 text-center text-[11px] text-terminal-green hover:border-terminal-green focus:outline-none focus:ring-2 focus:ring-white";

function AssetLinks({ symbol, result }: { symbol: string; result: DemoResult }) {
  return (
    <>
      {result.coingecko && (
        <a
          className={LINK_CLASS}
          href={coingeckoSearchUrl(symbol)}
          target="_blank"
          rel="noreferrer noopener"
          data-testid={symbol === result.assets[0]?.symbol ? "link-coingecko" : undefined}
        >
          {symbol} ON COINGECKO
        </a>
      )}
      {result.dexscreener && (
        <a
          className={LINK_CLASS}
          href={dexscreenerSearchUrl(symbol)}
          target="_blank"
          rel="noreferrer noopener"
          data-testid={symbol === result.assets[0]?.symbol ? "link-dexscreener" : undefined}
        >
          {symbol} ON DEXSCREENER
        </a>
      )}
    </>
  );
}

export function ResultScreen({
  box,
  depositUsd,
  quote,
}: {
  box: BoxDefinition;
  /** Deposit value from the quote the user just accepted. */
  depositUsd?: string | null;
  /** Full quote so a known-output result cannot fall back to the catalogue. */
  quote?: SimulatedQuote | null;
}) {
  const result = box.demo;
  const showTokenLinks = resultShowsTokenLinks(box);
  const sweep = box.resultKind === "harold-nft" ? resultSweepValue(depositUsd) : null;
  const received = resultAssetRows(box, quote);

  return (
    <div data-testid="result-step">
      <p className="text-[11px] uppercase tracking-[0.3em] text-terminal-green">
        {result.eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-bold text-white">{result.headline}</h3>

      {result.triggeredBox && (
        <p
          className="mt-2 inline-block border border-white/30 px-2 py-1 text-[10px] uppercase tracking-widest text-white/80"
          data-testid="triggered-box"
        >
          TRIGGERED BOX: {result.triggeredBox}
        </p>
      )}

      {sweep ? (
        <HaroldNftCard box={box} value={sweep.value} />
      ) : (
        <div className="mt-4 divide-y divide-white/10 border border-white/15">
          {received.map((asset) => (
            <div
              key={`${asset.symbol}-${asset.amount}`}
              className="flex items-center justify-between gap-4 px-3 py-2"
              data-testid={`received-${asset.symbol}`}
            >
              <div>
                <p className="text-sm font-bold text-white">{asset.symbol}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/40">
                  {box.resultKind === "position" ? "Position value" : "Received"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-terminal-green" data-testid={`received-amount-${asset.symbol}`}>
                  {asset.amount}
                </p>
                <p className="text-[10px] text-white/50" data-testid={`received-usd-${asset.symbol}`}>
                  {asset.usd}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <dl className="mt-4 space-y-2 text-[11px]">
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-white/40">TX ROUTE</dt>
          <dd className="min-w-0 break-words text-white/80 sm:text-right" data-testid="result-route">
            {result.route}
          </dd>
        </div>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-white/40">TX HASH</dt>
          <dd className="min-w-0 break-all text-white/50 sm:text-right" data-testid="tx-hash">
            {DEMO_TX_HASH}
          </dd>
        </div>
        {box.id === "russian-flag" && (
          <>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-white/40">DIRECTION</dt>
              <dd className="text-white/80 sm:text-right" data-testid="position-direction">
                Long 4x
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-white/40">ENTRY</dt>
              <dd className="text-white/80 sm:text-right" data-testid="position-entry">
                $1,000.00 USDC
              </dd>
            </div>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-4">
              <dt className="text-white/40">EXPIRES IN</dt>
              <dd className="text-terminal-orange sm:text-right" data-testid="position-countdown">
                23:59:59
              </dd>
            </div>
          </>
        )}
      </dl>

      <p className="mt-3 border-l-2 border-white/20 pl-3 text-[11px] leading-relaxed text-white/60">
        {result.note}
      </p>
      {sweep && (
        <p className="mt-2 text-[11px] text-white/50" data-testid="sweep-value-note">
          {SWEEP_VALUE_PREVIEW}
        </p>
      )}
      {received.some((asset) => asset.quoted) && (
        <p className="mt-2 text-[11px] text-white/50" data-testid="result-value-note">
          {RESULT_VALUE_PREVIEW}
        </p>
      )}
      {box.resultKind === "donation" && (
        <p className="mt-2 text-[11px] text-white/50">{WHITE_BOX_PRODUCT_LINE}</p>
      )}

      <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-2">
        {showTokenLinks &&
          received
            .filter(
              (asset) =>
                asset.symbol !== "USD SWEPT" &&
                asset.symbol !== "POSITION" &&
                asset.symbol !== "OFFER" &&
                asset.symbol !== "SCREENED" &&
                asset.symbol !== "NFT FLOOR",
            )
            .map((asset) => (
              <AssetLinks key={asset.symbol} symbol={asset.symbol} result={result} />
            ))}
        <a
          className={LINK_CLASS}
          href={DEMO_EXPLORER_URL}
          target="_blank"
          rel="noreferrer noopener"
          data-testid="link-explorer"
        >
          VIEW TRANSACTION
        </a>
        <button
          type="button"
          className={LINK_CLASS}
          data-testid="copy-tx-hash"
          onClick={() => {
            void navigator.clipboard?.writeText(DEMO_TX_HASH);
          }}
        >
          COPY TX HASH
        </button>
      </div>

      <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
        Simulated result. No transaction was broadcast.
      </p>
    </div>
  );
}

function HaroldNftCard({ box, value }: { box: BoxDefinition; value: string }) {
  return (
    <div className="mt-4 border border-white/30 bg-[#111] p-3" data-testid="harold-card">
      <div className="relative overflow-hidden border border-white/20 bg-[#1b1b1b]">
        <span className="absolute right-2 top-2 z-10 border border-white/40 bg-black/80 px-2 py-1 text-[10px] font-bold tracking-widest text-white">
          {value}
        </span>
        <div className="relative flex h-44 flex-col items-center justify-center gap-2 px-6 text-center">
          <Skull size={44} className="text-white/70" aria-hidden="true" />
          <p className="text-sm font-bold tracking-[0.3em] text-white">HIDE THE PAIN</p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            NFT art placeholder — final collection art to be supplied
          </p>
        </div>
      </div>
      <p className="sr-only">VALUE AT SWEEP: {value}</p>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
        <span className="text-white/70">{box.demo.headline}</span>
        <span className="text-white" data-testid="sweep-value">
          VALUE AT SWEEP: {value}
        </span>
      </div>
    </div>
  );
}
