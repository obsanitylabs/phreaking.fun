"use client";

import { ImageIcon } from "lucide-react";
import {
  CHECKERED_ACCEPT_WINDOW,
  CHECKERED_DEMO_LABEL,
  CHECKERED_WAITING,
  PURPLE_FLOOR_SWEEP,
  PURPLE_MAX_NFTS,
  PURPLE_SIMILAR_VALUE,
  RUSSIAN_BASKET,
  RUSSIAN_RETURN_NOTE,
  RUSSIAN_SHORT_CHANCE,
  RUSSIAN_TAX_TABLE,
} from "./copy";
import type { FlowState } from "./flowState";
import {
  DEMO_NFTS,
  DEMO_PORTFOLIO,
  MATCHED_PORTFOLIO,
  formatUsd,
  nftFloorTotal,
  portfolioTotal,
  purpleMode,
  toggleNftSelection,
} from "./moduleModel";

export function PurpleModule({
  state,
  onChange,
}: {
  state: FlowState;
  onChange: (partial: Partial<FlowState>) => void;
}) {
  const mode = purpleMode(state.toggles);
  const total = nftFloorTotal(state.selectedNfts);
  const atCap = state.selectedNfts.length >= PURPLE_MAX_NFTS;

  return (
    <div className="space-y-3" data-testid="purple-module" data-mode={mode}>
      <p className="text-[11px] text-white/60">{PURPLE_SIMILAR_VALUE}</p>
      {mode === "nft-to-alt" ? (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Select up to {PURPLE_MAX_NFTS} NFTs
            </p>
            <p className="text-[11px] text-white/70" data-testid="purple-floor-total">
              Floor {formatUsd(total)}
            </p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEMO_NFTS.map((nft) => {
              const active = state.selectedNfts.includes(nft.id);
              const blocked = atCap && !active;
              return (
                <button
                  key={nft.id}
                  type="button"
                  aria-pressed={active}
                  disabled={blocked}
                  data-testid={`nft-${nft.id}`}
                  onClick={() =>
                    onChange({
                      selectedNfts: toggleNftSelection(state.selectedNfts, nft.id),
                      notice: "Quote updated",
                    })
                  }
                  className={`border p-2 text-left focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? "border-terminal-green bg-terminal-green/10"
                      : "border-white/15"
                  }`}
                >
                  <span className="mb-2 flex h-12 items-center justify-center bg-white/5">
                    <ImageIcon size={18} className="text-white/50" aria-hidden="true" />
                  </span>
                  <span className="block truncate text-[10px] text-white">{nft.name}</span>
                  <span className="block text-[10px] text-white/40">Floor {nft.floorLabel}</span>
                </button>
              );
            })}
          </div>
          {atCap && (
            <p className="mt-2 text-[11px] text-terminal-orange" role="status">
              Purple accepts at most {PURPLE_MAX_NFTS} NFTs.
            </p>
          )}
        </div>
      ) : (
        <div className="border border-white/15 p-3 text-[11px]" data-testid="purple-floor-sweep">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Floor sweep</p>
          <p className="mt-1 text-white/70">{PURPLE_FLOOR_SWEEP}</p>
          <label className="mt-2 flex items-start gap-2 text-white/80">
            <input
              type="checkbox"
              checked={state.floorSweep}
              data-testid="floor-sweep-toggle"
              onChange={(event) =>
                onChange({ floorSweep: event.target.checked, notice: "Quote updated" })
              }
              className="mt-0.5 h-4 w-4 accent-[#A855F7] focus:outline-none focus:ring-2 focus:ring-white"
            />
            <span>Floor sweep</span>
          </label>
        </div>
      )}
    </div>
  );
}

export function CheckeredModule({
  state,
  onChange,
}: {
  state: FlowState;
  onChange: (partial: Partial<FlowState>) => void;
}) {
  const mine = portfolioTotal();
  const theirs = portfolioTotal(MATCHED_PORTFOLIO);

  return (
    <div className="space-y-3" data-testid="checkered-module" data-phase={state.matchPhase}>
      <p className="text-[11px] uppercase tracking-widest text-terminal-orange">
        Matchmaking is a {CHECKERED_DEMO_LABEL}. No real counterparty pool exists on Sepolia.
      </p>
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          Your escrow — read only
        </p>
        <ul className="mt-1 divide-y divide-white/10 border border-white/15">
          {DEMO_PORTFOLIO.map((asset) => (
            <li
              key={asset.symbol}
              className="flex items-center justify-between px-3 py-2 text-xs"
            >
              <span>
                {asset.amount} {asset.symbol}
              </span>
              <span className="text-white/50">{formatUsd(asset.usd)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[11px] text-white/60" data-testid="checkered-escrow-total">
          Escrow total {formatUsd(mine)}
        </p>
      </div>

      {state.matchPhase === "escrow" && (
        <button
          type="button"
          data-testid="join-queue"
          onClick={() =>
            onChange({
              matchPhase: "waiting",
              matchElapsed: 0,
              notice: "Queued in the demo simulator. No wallet was opened.",
            })
          }
          className="min-h-11 w-full border border-white/25 px-3 text-[11px] tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          JOIN DEMO QUEUE
        </button>
      )}

      {state.matchPhase === "waiting" && (
        <div className="border border-white/15 p-3" data-testid="checkered-waiting">
          <p className="text-[11px] font-bold tracking-widest text-white">{CHECKERED_WAITING}</p>
          <p className="mt-1 text-[11px] text-white/60">Elapsed {state.matchElapsed}s</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-testid="cancel-queue"
              onClick={() =>
                onChange({
                  matchPhase: "escrow",
                  matchElapsed: 0,
                  notice: "Left the demo queue. Nothing was escrowed.",
                })
              }
              className="min-h-11 flex-1 border border-white/25 px-3 text-[11px] tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
            >
              CANCEL
            </button>
            <button
              type="button"
              data-testid="simulate-match"
              onClick={() =>
                onChange({
                  matchPhase: "matched",
                  notice: "Demo match found. Accept or decline before review.",
                })
              }
              className="min-h-11 flex-1 border border-terminal-green px-3 text-[11px] tracking-widest text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
            >
              SIMULATE MATCH
            </button>
          </div>
        </div>
      )}

      {state.matchPhase === "matched" && (
        <div className="border border-terminal-orange/60 bg-[#1A1206] p-3" data-testid="checkered-match">
          <p className="text-[11px] font-bold text-terminal-orange">{CHECKERED_ACCEPT_WINDOW}</p>
          <p className="mt-2 text-[11px] text-white/80">
            Your portfolio {formatUsd(mine)} · theirs {formatUsd(theirs)}
          </p>
          <ul className="mt-2 divide-y divide-white/10 border border-white/15">
            {MATCHED_PORTFOLIO.map((asset) => (
              <li
                key={asset.symbol}
                className="flex items-center justify-between px-3 py-2 text-xs"
              >
                <span>
                  {asset.amount} {asset.symbol}
                </span>
                <span className="text-white/50">{formatUsd(asset.usd)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-testid="accept-match"
              onClick={() =>
                onChange({
                  matchAccepted: true,
                  notice: "Demo match accepted. This does not broadcast.",
                })
              }
              className="min-h-11 flex-1 border border-terminal-green px-3 text-[11px] tracking-widest text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
            >
              {state.matchAccepted ? "MATCH ACCEPTED" : "ACCEPT MATCH"}
            </button>
            <button
              type="button"
              data-testid="decline-match"
              onClick={() =>
                onChange({
                  matchPhase: "waiting",
                  matchAccepted: false,
                  matchElapsed: 0,
                  notice: "Declined. Returned to the demo queue with no penalty.",
                })
              }
              className="min-h-11 flex-1 border border-white/25 px-3 text-[11px] tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
            >
              DECLINE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function RussianFlagModule({ state }: { state: FlowState }) {
  const amount = Number(state.rows[0]?.amount ?? 0);
  const usdc = Number.isFinite(amount) ? amount : 0;

  return (
    <div className="space-y-2 border border-white/15 p-3 text-[11px]" data-testid="russian-module">
      <p className="text-[10px] uppercase tracking-widest text-white/40">24-hour position</p>
      <p className="text-white/70" data-testid="russian-conversion">
        Deposit converts to about {usdc.toFixed(2)} USDC. Quotes stay simulated.
      </p>
      <p className="text-white/70">Basket: {RUSSIAN_BASKET}</p>
      <p className="text-white/70">Lock: 24 hours. Leverage: random 2–10x.</p>
      <p className="text-white/70">{RUSSIAN_SHORT_CHANCE}</p>
      <p className="text-terminal-orange" data-testid="russian-tax">
        {RUSSIAN_TAX_TABLE}
      </p>
      <p className="text-white/50">{RUSSIAN_RETURN_NOTE}</p>
      <p className="text-[10px] uppercase tracking-widest text-terminal-orange">
        Sepolia demo. No GMX position is opened.
      </p>
    </div>
  );
}
