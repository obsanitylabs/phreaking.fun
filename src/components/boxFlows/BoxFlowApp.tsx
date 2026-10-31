"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Lock } from "lucide-react";
import {
  BOX_BY_ID,
  BOXES,
  BOXES_BY_TOOLKIT,
  DEMO_CHARITIES,
  TOOLKITS,
} from "@/components/design/boxFlows/catalog";
import type { BoxDefinition, BoxId } from "@/components/design/boxFlows/types";
import {
  capReachedCopy,
  gateFromSnapshot,
  readBoxStatus,
  statusLine,
  type BoxStatusSnapshot,
} from "./boxStatusRead";
import {
  BLUE_BAND_COPY,
  CAP_REACHED_COPY,
  FINALITY_KEEP_OPEN,
  GREEN_INELIGIBLE_COPY,
  PAUSED_COPY,
  QUOTE_EXPIRED_COPY,
  REVERTED_COPY,
  SIGNATURE_CANCELLED,
  STAKING_LOCKED_COPY,
  WRONG_NETWORK_COPY,
} from "./copy";
import { CheckeredModule, PurpleModule, RussianFlagModule } from "./BoxModules";
import { FinalityOverlay } from "./FinalityOverlay";
import {
  canAdvanceFromConfigure,
  canConfirmReview,
  initialFlowState,
  signBlockedReason,
  stagesFor,
  type CapKind,
  type FlowState,
  type GateKind,
} from "./flowState";
import { formatUsd as formatModuleUsd, nftFloorTotal, purpleMode, purpleReviewReceive } from "./moduleModel";
import { QuotePanel } from "./QuotePanel";
import {
  buildSimulatedQuote,
  quoteInputKey,
  QUOTE_UPDATED,
  type SimulatedQuote,
} from "./quoteModel";
import { readSepoliaSpotPrices, type SpotPriceBook } from "./spotPriceRead";
import { ResultScreen } from "./ResultScreen";
import { ReviewScreen } from "./ReviewScreen";
import { SepoliaBanner } from "./SepoliaBanner";

const WITHHELD = ["yellow", "pink"];

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const PRICES: Record<string, number> = {
  ETH: 3200,
  USDC: 1,
  LINK: 14,
  WBTC: 63120,
};

function sendRows(box: BoxDefinition, state: FlowState) {
  if (box.id === "purple" && purpleMode(state.toggles) === "nft-to-alt") {
    return state.selectedNfts.length === 0
      ? []
      : [
          {
            symbol: "NFTs",
            amount: String(state.selectedNfts.length),
            usd: formatModuleUsd(nftFloorTotal(state.selectedNfts)),
          },
        ];
  }
  if (box.assetMode === "wallet") {
    return [
      { symbol: "ETH", amount: "0.420", usd: "$1,344.00" },
      { symbol: "USDC", amount: "498.60", usd: "$498.60" },
    ];
  }
  if (box.assetMode === "none") {
    return [{ symbol: "GRAB", amount: state.machine, usd: state.machine }];
  }
  return state.rows
    .filter((row) => Number(row.amount) > 0)
    .map((row) => ({
      symbol: row.token,
      amount: row.amount,
      usd: formatUsd((PRICES[row.token] ?? 0) * Number(row.amount)),
    }));
}

function GateBanner({
  gate,
  capKind,
  notice,
}: {
  gate: GateKind;
  capKind: CapKind | null;
  notice: string | null;
}) {
  if (gate === "none") return null;
  const copy =
    gate === "paused"
      ? notice && notice.startsWith("Paused. Unpause")
        ? notice
        : PAUSED_COPY
      : gate === "cap"
        ? capKind
          ? capReachedCopy(capKind)
          : CAP_REACHED_COPY
        : gate === "wrong-network"
          ? WRONG_NETWORK_COPY
          : STAKING_LOCKED_COPY;
  return (
    <p
      role="status"
      data-testid={`gate-${gate}`}
      className="border border-terminal-orange bg-[#1A1206] px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-terminal-orange"
    >
      {copy}
    </p>
  );
}

export function BoxFlowApp() {
  const [selectedId, setSelectedId] = useState<BoxId | null>(null);
  const [state, setState] = useState<FlowState | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [status, setStatus] = useState<BoxStatusSnapshot | null>(null);
  const [spot, setSpot] = useState<SpotPriceBook | null>(null);
  const [spotNonce, setSpotNonce] = useState(0);
  const [chainId, setChainId] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const selected = selectedId ? BOX_BY_ID[selectedId] : null;

  useEffect(() => {
    const ethereum = (
      window as Window & { ethereum?: { chainId?: string; request?: (args: { method: string }) => Promise<string> } }
    ).ethereum;
    if (!ethereum) return;
    let cancelled = false;
    const apply = (hex: string) => {
      const next = Number.parseInt(hex, 16);
      if (!cancelled && Number.isFinite(next)) setChainId(next);
    };
    if (ethereum.chainId) apply(ethereum.chainId);
    ethereum.request?.({ method: "eth_chainId" }).then(apply).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selected) {
      setStatus(null);
      return;
    }
    let cancelled = false;
    setStatus(null);
    readBoxStatus({ boxId: selected.id, search: window.location.search }).then((snapshot) => {
      if (cancelled) return;
      setStatus(snapshot);
      setState((current) => {
        if (!current || current.gate === "locked") return current;
        if (current.gate === "wrong-network" && snapshot.source !== "contract") return current;
        if (snapshot.source === "error") {
          return {
            ...current,
            gate: "paused",
            capKind: null,
            notice: PAUSED_COPY,
          };
        }
        if (snapshot.source !== "contract") {
          return {
            ...current,
            notice: current.notice ?? snapshot.note,
          };
        }
        const live = gateFromSnapshot(snapshot);
        if (live.gate === "paused" || live.gate === "cap") {
          return {
            ...current,
            gate: live.gate,
            capKind: live.capKind,
            notice: live.notice,
          };
        }
        if (current.gate === "paused" || current.gate === "cap") {
          return { ...current, gate: "none", capKind: null, notice: statusLine(snapshot) };
        }
        return { ...current, notice: current.notice ?? statusLine(snapshot) };
      });
    });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  useEffect(() => {
    if (!selected) {
      setSpot(null);
      return;
    }
    let cancelled = false;
    readSepoliaSpotPrices().then((book) => {
      if (!cancelled) setSpot(book);
    });
    return () => {
      cancelled = true;
    };
  }, [selected, spotNonce]);

  useEffect(() => {
    if (!selectedId || !state) return;
    if (state.gate === "locked") return;
    if (chainId !== null && chainId !== 11155111) {
      if (state.gate !== "wrong-network") {
        patch({ gate: "wrong-network", capKind: null, notice: WRONG_NETWORK_COPY });
      }
      return;
    }
    if (state.gate === "wrong-network" && chainId === 11155111) {
      patch({ gate: "none", capKind: null, notice: null });
    }
    // Only the chain id and the current gate should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId, selectedId, state?.gate]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const box = params.get("box");
    if (box && box in BOX_BY_ID && !WITHHELD.includes(box)) {
      openBox(BOX_BY_ID[box as BoxId], null);
    }
    // openBox is stable enough for the initial deep link only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selected) return;
    const dialog = dialogRef.current;
    const frame = window.requestAnimationFrame(() => {
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const preferred =
        dialog?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable?.[0];
      preferred?.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (stateRef.current?.step === "finality") {
          event.preventDefault();
          return;
        }
        closeFlow();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = [...dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter((item) => !item.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, [selectedId, state?.step, state?.finalityHidden]);

  useEffect(() => {
    if (state?.step !== "finality" || reducedMotion) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state?.step, reducedMotion]);

  useEffect(() => {
    if (!state || state.step === "finality" || state.step === "result" || state.step === "error") {
      return;
    }
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [state?.step, selectedId]);

  const quote = useMemo(() => {
    if (!selected || !state) return null;
    return buildSimulatedQuote(selected, state, nowMs, spot ?? { source: "fallback" });
  }, [selected, state, nowMs, spot]);

  const quoteKey = state ? quoteInputKey(state) : "";
  const quoteKeyRef = useRef("");
  useEffect(() => {
    if (!state) {
      quoteKeyRef.current = "";
      return;
    }
    if (quoteKeyRef.current === "") {
      quoteKeyRef.current = quoteKey;
      return;
    }
    if (quoteKey === quoteKeyRef.current) return;
    quoteKeyRef.current = quoteKey;
    const issuedAt = Date.now();
    setNowMs(issuedAt);
    setState((current) =>
      current
        ? {
            ...current,
            quoteIssuedAt: issuedAt,
            quoteRevision: current.quoteRevision + 1,
            notice: current.step === "review" ? QUOTE_UPDATED : current.notice,
            step: current.step === "review" ? "configure" : current.step,
          }
        : current,
    );
  }, [quoteKey, state]);

  function openBox(box: BoxDefinition, trigger: HTMLElement | null) {
    openerRef.current = trigger;
    setElapsed(0);
    const issuedAt = Date.now();
    setNowMs(issuedAt);
    quoteKeyRef.current = "";
    setSelectedId(box.id);
    setState({ ...initialFlowState(box), quoteIssuedAt: issuedAt });
  }

  function closeFlow() {
    if (stateRef.current?.step === "finality") return;
    const restore = openerRef.current;
    setSelectedId(null);
    setState(null);
    window.requestAnimationFrame(() => restore?.focus());
  }

  function patch(partial: Partial<FlowState>) {
    setState((current) => (current ? { ...current, ...partial } : current));
  }

  function refreshQuote() {
    const issuedAt = Date.now();
    setNowMs(issuedAt);
    setSpotNonce((value) => value + 1);
    patch({
      quoteIssuedAt: issuedAt,
      quoteRevision: (state?.quoteRevision ?? 0) + 1,
      notice: QUOTE_UPDATED,
    });
  }

  const stages = useMemo(
    () => (selected && state ? stagesFor(selected, state.toggles) : []),
    [selected, state],
  );

  const catalogue = (
    <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
        15 boxes · Yellow and Pink withheld · Sepolia only
      </p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
        Pick a box. Read the review before you sign.
      </h1>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/50">
        Production flow shell. Quotes on this page are a labelled 60-second
        simulator. Pause and cap read the Sepolia fleet when an address is
        configured. Checkered has no counterparty pool and Russian Flag does not
        open a GMX position. Deposit value can use a Sepolia Chainlink spot read. Confirm does not open a wallet or broadcast.
      </p>
      {TOOLKITS.map((toolkit) => (
        <section key={toolkit.id} className="mt-8" aria-labelledby={`toolkit-${toolkit.id}`}>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/15 pb-1">
            <h2 id={`toolkit-${toolkit.id}`} className="text-xs font-bold tracking-[0.25em] text-white">
              {toolkit.label}
            </h2>
            <p className="max-w-3xl text-[11px] text-white/40">{toolkit.notice}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BOXES_BY_TOOLKIT[toolkit.id].map((box) => {
              const locked = box.status === "locked";
              return (
                <button
                  key={box.id}
                  type="button"
                  data-testid={`box-card-${box.id}`}
                  aria-label={`${box.name}: ${box.oneLine}`}
                  onClick={(event) => openBox(box, event.currentTarget)}
                  className="flex min-h-[180px] flex-col border border-white/15 bg-black p-3 text-left hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white"
                  style={{ borderTopColor: box.accent, borderTopWidth: 2 }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold tracking-widest text-white">{box.name}</span>
                    <span className="text-[9px] uppercase tracking-widest text-white/40">
                      {box.mechanicLabel}
                    </span>
                  </span>
                  <span className="mt-3 text-[12px] leading-snug text-white/75">{box.oneLine}</span>
                  <span className="mt-auto flex items-center justify-between pt-3 text-[9px] uppercase tracking-widest text-white/40">
                    <span className="flex flex-wrap gap-1">
                      {(box.chips ?? []).map((chip) => (
                        <span key={chip} className="border border-white/20 px-1 py-0.5">
                          {chip}
                        </span>
                      ))}
                      {locked && (
                        <span className="inline-flex items-center gap-1 border border-white/20 px-1 py-0.5">
                          <Lock size={10} aria-hidden="true" /> {STAKING_LOCKED_COPY}
                        </span>
                      )}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      Select <ChevronRight size={12} aria-hidden="true" />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );

  return (
    <div
      className="min-h-screen bg-terminal-black font-mono text-white"
      data-reduced-motion={reducedMotion ? "true" : "false"}
    >
      <SepoliaBanner />
      {catalogue}
      {selected && state && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && state.step !== "finality") {
              closeFlow();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="box-flow-title"
            data-testid="box-flow-dialog"
            data-step={state.step}
            className="flex h-[100dvh] w-full max-w-full flex-col overflow-hidden border border-white/20 bg-black sm:h-auto sm:max-h-[90vh] sm:max-w-[720px]"
          >
            <SepoliaBanner />
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
                  {state.step === "result" ? "DONE" : state.step}
                </p>
                <h2 id="box-flow-title" className="text-lg font-bold tracking-widest text-white">
                  {state.step === "review" ? `REVIEW ${selected.name}` : selected.name}
                </h2>
                <p className="text-[11px] text-white/50">{selected.mechanicLabel}</p>
              </div>
              {state.step !== "finality" && (
                <button
                  type="button"
                  onClick={closeFlow}
                  className="border border-white/25 px-3 py-2 text-[11px] tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
                >
                  CLOSE
                </button>
              )}
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              <GateBanner gate={state.gate} capKind={state.capKind} notice={state.notice} />
              {status && (
                <p
                  data-testid="box-status-source"
                  data-source={status.source}
                  className="text-[10px] uppercase tracking-widest text-white/40"
                >
                  {statusLine(status)}
                </p>
              )}

              {state.step === "configure" && (
                <ConfigureStep
                  box={selected}
                  state={state}
                  quote={quote}
                  onChange={patch}
                  onRefreshQuote={refreshQuote}
                />
              )}
              {state.step === "review" && (
                <ReviewScreen
                  box={selected}
                  sendRows={sendRows(selected, state)}
                  route={quote?.route ?? selected.demo.route}
                  quote={quote}
                  onRefreshQuote={refreshQuote}
                  charityLabel={
                    selected.id === "white"
                      ? state.charityMode === "random"
                        ? "Random charity selected by TheGivingBlock at execution"
                        : DEMO_CHARITIES[0]
                      : undefined
                  }
                  acknowledged={state.acknowledged}
                  ackError={state.ackError}
                  youReceiveOverride={
                    selected.id === "purple"
                      ? purpleReviewReceive(purpleMode(state.toggles), state.selectedNfts.length)
                      : undefined
                  }
                  onAcknowledge={(value) => patch({ acknowledged: value, ackError: false })}
                />
              )}
              {state.step === "sign" && (
                <div data-testid="sign-step">
                  <h3 className="text-lg font-bold">CONFIRM IN WALLET</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/70">
                    {signBlockedReason()}
                  </p>
                  <p className="mt-2 text-[12px] text-white/60">
                    0.05 ETH → {selected.name}. Network: Sepolia (11155111).
                  </p>
                  <p className="mt-3 text-[11px] text-white/40">
                    phreaking.fun will never ask for your seed phrase.
                  </p>
                </div>
              )}
              {state.step === "finality" && !state.finalityHidden && (
                <FinalityOverlay
                  boxName={selected.name}
                  accent={selected.accent}
                  stages={stages}
                  stageIndex={state.stageIndex}
                  reducedMotion={reducedMotion}
                  elapsedSeconds={elapsed}
                />
              )}
              {state.step === "finality" && state.finalityHidden && (
                <p className="text-[12px] text-white/60" data-testid="finality-collapsed-note">
                  {FINALITY_KEEP_OPEN}
                </p>
              )}
              {state.step === "result" && <ResultScreen box={selected} />}
              {state.step === "error" && (
                <div data-testid="error-step">
                  <h3 className="text-lg font-bold">{REVERTED_COPY}</h3>
                  <p className="mt-2 text-[12px] text-white/60">
                    Nothing was taken. Your amount is still on the configure step.
                  </p>
                  <p className="mt-3 text-[11px] text-white/40" data-testid="support-ref">
                    BOX-{selected.id} / TX none / preview
                  </p>
                </div>
              )}
              {state.notice && (
                <p role="status" className="text-[11px] text-white/60">
                  {state.notice}
                </p>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-white/10 bg-black px-4 py-3">
              <FlowFooter
                box={selected}
                quote={quote}
                state={state}
                onClose={closeFlow}
                onPatch={patch}
              />
            </div>
          </div>
          {state.step === "finality" && state.finalityHidden && (
            <div
              data-testid="finality-bar"
              className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-3 border-t border-white/20 bg-black px-4 py-3"
            >
              <p className="text-[11px] uppercase tracking-widest text-white">
                {selected.name} executing — {stages[state.stageIndex] ?? "SUBMITTED"}
              </p>
              <button
                type="button"
                data-autofocus="true"
                onClick={() => patch({ finalityHidden: false })}
                className="min-h-11 border border-white/25 px-3 text-[11px] tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
              >
                SHOW
              </button>
            </div>
          )}
        </div>
      )}
      <p className="sr-only" data-testid="box-count">
        {BOXES.length}
      </p>
      <p className="sr-only" data-testid="withheld">
        {WITHHELD.join(",")}
      </p>
    </div>
  );
}

function ConfigureStep({
  box,
  state,
  quote,
  onChange,
  onRefreshQuote,
}: {
  box: BoxDefinition;
  state: FlowState;
  quote: SimulatedQuote | null;
  onChange: (partial: Partial<FlowState>) => void;
  onRefreshQuote: () => void;
}) {
  if (box.status === "locked" || state.gate === "locked") {
    return (
      <div data-testid="locked-configure">
        <p className="text-sm font-bold" tabIndex={-1} data-autofocus="true">
          {STAKING_LOCKED_COPY}
        </p>
        <p className="mt-2 text-[12px] text-white/60">
          Vibe boxes stay locked on Sepolia. The real staking gate is not live.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="configure-step">
      <p className="text-[12px] leading-relaxed text-white/70">{box.oneLine}</p>
      {box.assetMode !== "wallet" && box.assetMode !== "none" && box.assetMode !== "nft" && (
        <label className="block text-[11px] uppercase tracking-widest text-white/40">
          Amount
          <input
            data-autofocus="true"
            value={state.rows[0]?.amount ?? ""}
            onChange={(event) =>
              onChange({
                rows: [{ token: state.rows[0]?.token ?? "ETH", amount: event.target.value }],
              })
            }
            inputMode="decimal"
            className="mt-1 w-full border border-white/20 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
          />
        </label>
      )}
      {box.toggles?.map((toggle) => (
        <div key={toggle.id} role="radiogroup" aria-label={toggle.label} className="flex gap-2">
          {toggle.options.map((option) => {
            const active = state.toggles[toggle.id] === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={active}
                data-testid={`toggle-${toggle.id}-${option.id}`}
                onClick={() =>
                  onChange({
                    toggles: { ...state.toggles, [toggle.id]: option.id },
                    notice: "Quote updated",
                  })
                }
                className={`border px-3 py-2 text-[11px] tracking-widest focus:outline-none focus:ring-2 focus:ring-white ${
                  active ? "border-terminal-green text-terminal-green" : "border-white/20 text-white/60"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ))}
      {box.flowKind === "portfolio-offer" && (
        <div className="border border-white/25 p-3" data-testid="blue-offer">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Offer for the lot</p>
          <p className="mt-1 text-sm text-white">$160.00 → XCM + RIO + LINK</p>
          <p className="text-[11px] text-white/50">{BLUE_BAND_COPY}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              data-testid="accept-offer"
              onClick={() => onChange({ offerAccepted: true, notice: "Offer accepted. Continue to review." })}
              className="min-h-11 flex-1 border border-terminal-green px-3 text-[10px] uppercase tracking-widest text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
            >
              {state.offerAccepted ? "Offer accepted" : "Accept offer"}
            </button>
            <button
              type="button"
              data-testid="reject-offer"
              onClick={() =>
                onChange({
                  offerAccepted: false,
                  notice: "Offer rejected. Request a new offer to continue.",
                })
              }
              className="min-h-11 flex-1 border border-white/25 px-3 text-[10px] uppercase tracking-widest text-white/70 focus:outline-none focus:ring-2 focus:ring-white"
            >
              Reject offer
            </button>
          </div>
        </div>
      )}
      {box.flowKind === "recycle" && (
        <div className="border border-white/15 p-3 text-[11px]" data-testid="green-screen">
          <p className="text-[10px] uppercase tracking-widest text-white/40">Receipt screening</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-white/70">Contract age and 90-day volume</span>
            <span className={state.greenEligible ? "text-terminal-green" : "text-terminal-orange"}>
              {state.greenEligible ? "PASS" : "FAIL"}
            </span>
          </div>
          {!state.greenEligible && (
            <p className="mt-2 font-bold text-terminal-orange" role="alert">
              {GREEN_INELIGIBLE_COPY}
            </p>
          )}
          <button
            type="button"
            data-testid="toggle-eligibility"
            onClick={() =>
              onChange({
                greenEligible: !state.greenEligible,
                notice: state.greenEligible ? GREEN_INELIGIBLE_COPY : "Asset meets the recycler screen.",
              })
            }
            className="mt-2 min-h-11 border border-white/25 px-3 text-[10px] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
          >
            {state.greenEligible ? "Mark asset ineligible" : "Remove ineligible asset"}
          </button>
        </div>
      )}
      {box.id === "purple" && <PurpleModule state={state} onChange={onChange} />}
      {box.id === "purple" && state.toggles.mode === "alt-to-nft" && (
        <label className="block text-[11px] uppercase tracking-widest text-white/40">
          Altcoin amount
          <input
            value={state.rows[0]?.amount ?? ""}
            onChange={(event) =>
              onChange({
                rows: [{ token: "USDC", amount: event.target.value }],
                notice: "Quote updated",
              })
            }
            inputMode="decimal"
            className="mt-1 w-full border border-white/20 bg-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white"
          />
        </label>
      )}
      {box.id === "checkered" && <CheckeredModule state={state} onChange={onChange} />}
      {box.id === "russian-flag" && <RussianFlagModule state={state} />}
      {box.id === "white" && (
        <div className="flex gap-2">
          {(["random", "choose"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onChange({ charityMode: mode })}
              className={`border px-3 py-2 text-[11px] uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-white ${
                state.charityMode === mode
                  ? "border-white text-white"
                  : "border-white/20 text-white/50"
              }`}
            >
              {mode === "random" ? "Random charity" : "Choose charity"}
            </button>
          ))}
        </div>
      )}
      {box.id === "coin-gatcha" && (
        <div className="flex gap-2">
          {(["$1", "$10", "$100"] as const).map((price) => (
            <button
              key={price}
              type="button"
              onClick={() => onChange({ machine: price })}
              className={`border px-3 py-2 text-[11px] focus:outline-none focus:ring-2 focus:ring-white ${
                state.machine === price ? "border-terminal-green text-terminal-green" : "border-white/20"
              }`}
            >
              {price}
            </button>
          ))}
        </div>
      )}
      {box.status === "demo" && (
        <p className="text-[11px] uppercase tracking-widest text-terminal-orange">
          Demo simulator — no live counterparty or GMX position on Sepolia.
        </p>
      )}
      {quote && <QuotePanel quote={quote} onRefresh={onRefreshQuote} />}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["none", "Clear gate"],
            ["paused", "Preview paused"],
            ["cap", "Preview cap"],
            ["wrong-network", "Preview wrong network"],
          ] as const
        ).map(([gate, label]) => (
          <button
            key={gate}
            type="button"
            data-testid={`set-gate-${gate}`}
            onClick={() =>
              onChange({
                gate,
                capKind: gate === "cap" ? "tx" : null,
                notice: gate === "none" ? null : undefined,
              })
            }
            className="border border-white/15 px-2 py-1 text-[10px] uppercase tracking-widest text-white/50 focus:outline-none focus:ring-2 focus:ring-white"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FlowFooter({
  box,
  state,
  quote,
  onClose,
  onPatch,
}: {
  box: BoxDefinition;
  state: FlowState;
  quote: SimulatedQuote | null;
  onClose: () => void;
  onPatch: (partial: Partial<FlowState>) => void;
}) {
  const quoteExpired = Boolean(quote?.expired);
  const spotBlocked = Boolean(quote?.spotBlocked);
  const quoteBlocked = quoteExpired || spotBlocked;
  if (state.step === "configure") {
    const ready = canAdvanceFromConfigure(box, state, quoteBlocked);
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          EXIT
        </button>
        <button
          type="button"
          data-testid="review-button"
          disabled={!ready}
          onClick={() => onPatch({ step: "review", notice: null })}
          className="min-h-11 flex-1 border border-terminal-green px-4 py-3 text-xs font-bold tracking-widest text-terminal-green disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/25 focus:outline-none focus:ring-2 focus:ring-white"
        >
          {ready
            ? "REVIEW"
            : quote?.spotBlocked && !quoteExpired
              ? "SPOT READ REQUIRED"
              : quoteExpired
              ? QUOTE_EXPIRED_COPY
              : state.gate === "wrong-network"
              ? WRONG_NETWORK_COPY
              : box.id === "checkered" && state.matchPhase !== "matched"
                ? "WAITING FOR MATCH"
                : box.id === "purple" && state.selectedNfts.length === 0 && state.toggles.mode !== "alt-to-nft"
                  ? "SELECT AN NFT"
                  : "REVIEW BLOCKED"}
        </button>
      </div>
    );
  }

  if (state.step === "review") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPatch({ step: "configure" })}
          className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          BACK
        </button>
        <button
          type="button"
          data-testid="confirm-in-wallet"
          disabled={quoteBlocked}
          onClick={() => {
            if (quote?.spotBlocked && !quoteExpired) {
              onPatch({ notice: quote.label });
              return;
            }
            if (quoteExpired) {
              onPatch({ notice: QUOTE_EXPIRED_COPY });
              return;
            }
            if (!canConfirmReview(box, state, quoteBlocked)) {
              onPatch({ ackError: true });
              return;
            }
            onPatch({ step: "sign", ackError: false, notice: null });
          }}
          className="min-h-11 flex-1 border border-white px-4 py-3 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/25"
        >
          CONFIRM IN WALLET
        </button>
      </div>
    );
  }

  if (state.step === "sign") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => onPatch({ step: "review", notice: SIGNATURE_CANCELLED, signing: false })}
          className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          CANCEL
        </button>
        <button
          type="button"
          data-testid="preview-finality"
          onClick={() => onPatch({ step: "finality", stageIndex: 0, finalityHidden: false, notice: null })}
          className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest text-white/70 focus:outline-none focus:ring-2 focus:ring-white"
        >
          PREVIEW FINALITY (NO TX)
        </button>
      </div>
    );
  }

  if (state.step === "finality") {
    if (state.finalityHidden) return null;
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="hide-finality"
          onClick={() => onPatch({ finalityHidden: true })}
          className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          HIDE
        </button>
        <button
          type="button"
          data-testid="preview-result"
          onClick={() => onPatch({ step: "result", finalityHidden: false })}
          className="min-h-11 flex-1 border border-terminal-green px-4 py-3 text-xs tracking-widest text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
        >
          PREVIEW RESULT
        </button>
        <button
          type="button"
          data-testid="preview-error"
          onClick={() => onPatch({ step: "error", finalityHidden: false })}
          className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          PREVIEW ERROR
        </button>
      </div>
    );
  }

  if (state.step === "result") {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          data-testid="open-another"
          onClick={() =>
            onPatch({
              ...initialFlowState(box),
              rows: state.rows,
              toggles: state.toggles,
              charityMode: state.charityMode,
              machine: state.machine,
              selectedNfts: state.selectedNfts,
              floorSweep: state.floorSweep,
            })
          }
          className="min-h-11 flex-1 border border-terminal-green px-4 py-3 text-xs tracking-widest text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
        >
          OPEN ANOTHER {box.name}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 flex-1 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          BACK TO TOOLKIT
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        data-testid="try-again"
        onClick={() => onPatch({ step: "configure", notice: null })}
        className="min-h-11 flex-1 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
      >
        TRY AGAIN
      </button>
      <button
        type="button"
        onClick={onClose}
        className="min-h-11 border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
      >
        BACK TO TOOLKIT
      </button>
    </div>
  );
}
