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
  CAP_REACHED_COPY,
  PAUSED_COPY,
  SIGNATURE_CANCELLED,
  STAKING_LOCKED_COPY,
  WRONG_NETWORK_COPY,
} from "./copy";
import {
  canAdvanceFromConfigure,
  canConfirmReview,
  initialFlowState,
  signBlockedReason,
  stagesFor,
  type FlowState,
  type GateKind,
} from "./flowState";
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

function GateBanner({ gate }: { gate: GateKind }) {
  if (gate === "none") return null;
  const copy =
    gate === "paused"
      ? PAUSED_COPY
      : gate === "cap"
        ? CAP_REACHED_COPY
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  const selected = selectedId ? BOX_BY_ID[selectedId] : null;

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
    const previous = document.activeElement;
    if (previous instanceof HTMLElement) restoreRef.current = previous;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (state?.step === "finality") {
          event.preventDefault();
          return;
        }
        closeFlow();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus();
    };
  }, [selectedId]);

  function openBox(box: BoxDefinition, trigger: HTMLElement | null) {
    restoreRef.current = trigger;
    setSelectedId(box.id);
    setState(initialFlowState(box));
  }

  function closeFlow() {
    setSelectedId(null);
    setState(null);
  }

  function patch(partial: Partial<FlowState>) {
    setState((current) => (current ? { ...current, ...partial } : current));
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
        Production flow shell. Quotes on this page are simulated. Confirm does not
        open a wallet or broadcast a transaction.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["paused", "cap", "wrong-network"] as GateKind[]).map((gate) => (
          <span
            key={gate}
            className="border border-white/15 px-2 py-1 text-[9px] uppercase tracking-widest text-white/40"
          >
            Preview gates inside the modal
          </span>
        ))}
      </div>

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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="box-flow-title"
            data-testid="box-flow-dialog"
            className="flex max-h-[100dvh] w-full flex-col border border-white/20 bg-black sm:max-h-[90vh] sm:max-w-[720px]"
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
              <GateBanner gate={state.gate} />

              {state.step === "configure" && (
                <ConfigureStep
                  box={selected}
                  state={state}
                  onChange={patch}
                />
              )}
              {state.step === "review" && (
                <ReviewScreen
                  box={selected}
                  sendRows={sendRows(selected, state)}
                  route={
                    selected.id === "red" && state.toggles.route === "cross-chain"
                      ? "Sepolia -> Axelar -> destination chain"
                      : selected.demo.route
                  }
                  charityLabel={
                    selected.id === "white"
                      ? state.charityMode === "random"
                        ? "Random charity selected by TheGivingBlock at execution"
                        : DEMO_CHARITIES[0]
                      : undefined
                  }
                  acknowledged={state.acknowledged}
                  ackError={state.ackError}
                  onAcknowledge={(value) => patch({ acknowledged: value, ackError: false })}
                />
              )}
              {state.step === "sign" && (
                <div data-testid="sign-step">
                  <h3 className="text-lg font-bold">Confirm in wallet</h3>
                  <p className="mt-2 text-[12px] leading-relaxed text-white/70">
                    {signBlockedReason()}
                  </p>
                  <p className="mt-3 text-[11px] text-white/40">
                    phreaking.fun will never ask for your seed phrase.
                  </p>
                </div>
              )}
              {state.step === "finality" && (
                <ol data-testid="finality-stages" className="space-y-2" aria-live="polite">
                  {stages.map((stage, index) => (
                    <li
                      key={stage}
                      className={
                        index === state.stageIndex
                          ? "text-terminal-green"
                          : "text-white/40"
                      }
                    >
                      {index < state.stageIndex ? "done" : index === state.stageIndex ? "active" : "pending"}{" "}
                      {stage}
                    </li>
                  ))}
                </ol>
              )}
              {state.step === "result" && (
                <div data-testid="result-step">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-terminal-green">
                    {selected.demo.eyebrow}
                  </p>
                  <h3 className="mt-2 text-xl font-bold">{selected.demo.headline}</h3>
                  {selected.demo.triggeredBox && (
                    <p className="mt-2 text-[12px]" data-testid="triggered-box">
                      TRIGGERED BOX: {selected.demo.triggeredBox}
                    </p>
                  )}
                  <p className="mt-3 text-[12px] text-white/70">{selected.demo.note}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
                    Simulated result. No transaction was broadcast.
                  </p>
                </div>
              )}
              {state.step === "error" && (
                <div data-testid="error-step">
                  <h3 className="text-lg font-bold">Transaction reverted. Your deposit was not taken.</h3>
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
                state={state}
                onClose={closeFlow}
                onPatch={patch}
              />
            </div>
          </div>
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
  onChange,
}: {
  box: BoxDefinition;
  state: FlowState;
  onChange: (partial: Partial<FlowState>) => void;
}) {
  if (box.status === "locked" || state.gate === "locked") {
    return (
      <div data-testid="locked-configure">
        <p className="text-sm font-bold">{STAKING_LOCKED_COPY}</p>
        <p className="mt-2 text-[12px] text-white/60">
          Vibe boxes stay locked on Sepolia. The real staking gate is not live.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="configure-step">
      <p className="text-[12px] leading-relaxed text-white/70">{box.oneLine}</p>
      {box.assetMode !== "wallet" && box.assetMode !== "none" && (
        <label className="block text-[11px] uppercase tracking-widest text-white/40">
          Amount
          <input
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
            onClick={() => onChange({ gate })}
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
  onClose,
  onPatch,
}: {
  box: BoxDefinition;
  state: FlowState;
  onClose: () => void;
  onPatch: (partial: Partial<FlowState>) => void;
}) {
  if (state.step === "configure") {
    const ready = canAdvanceFromConfigure(box, state);
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          EXIT
        </button>
        <button
          type="button"
          disabled={!ready}
          onClick={() => onPatch({ step: "review", notice: null })}
          className="flex-1 border border-terminal-green px-4 py-3 text-xs font-bold tracking-widest text-terminal-green disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/25 focus:outline-none focus:ring-2 focus:ring-white"
        >
          {ready ? "REVIEW" : state.gate === "wrong-network" ? WRONG_NETWORK_COPY : "REVIEW BLOCKED"}
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
          className="border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          BACK
        </button>
        <button
          type="button"
          data-testid="confirm-in-wallet"
          onClick={() => {
            if (!canConfirmReview(box, state)) {
              onPatch({ ackError: true });
              return;
            }
            onPatch({ step: "sign", ackError: false, notice: null });
          }}
          className="flex-1 border border-white px-4 py-3 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
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
          className="border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          CANCEL
        </button>
        <button
          type="button"
          data-testid="preview-finality"
          onClick={() => onPatch({ step: "finality", stageIndex: 0, notice: null })}
          className="border border-white/25 px-4 py-3 text-xs tracking-widest text-white/70 focus:outline-none focus:ring-2 focus:ring-white"
        >
          PREVIEW FINALITY (NO TX)
        </button>
      </div>
    );
  }

  if (state.step === "finality") {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPatch({ step: "result" })}
          className="flex-1 border border-terminal-green px-4 py-3 text-xs tracking-widest text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
        >
          PREVIEW RESULT
        </button>
        <button
          type="button"
          onClick={() => onPatch({ step: "error" })}
          className="border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
        >
          PREVIEW ERROR
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClose}
      className="w-full border border-white/25 px-4 py-3 text-xs tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
    >
      BACK TO TOOLKIT
    </button>
  );
}
