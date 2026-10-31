"use client";

import { FINALITY_KEEP_OPEN, TAKING_LONGER } from "./copy";

export function FinalityOverlay({
  boxName,
  accent,
  stages,
  stageIndex,
  reducedMotion,
  elapsedSeconds,
}: {
  boxName: string;
  accent: string;
  stages: string[];
  stageIndex: number;
  reducedMotion: boolean;
  elapsedSeconds: number;
}) {
  const active = stages[stageIndex] ?? stages[0] ?? "SUBMITTED";
  const slow = elapsedSeconds >= 45;
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div
      data-testid="finality-overlay"
      className="border px-4 py-5"
      style={{ borderColor: accent, background: "#000" }}
    >
      {!reducedMotion && (
        <div
          aria-hidden="true"
          data-testid="finality-scanline"
          className="mb-4 h-px w-full"
          style={{
            backgroundImage: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
          }}
        />
      )}
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">Executing</p>
      <h3 className="mt-2 text-xl font-bold text-white">{active}</h3>
      <p className="mt-1 text-[11px] text-white/40">
        {boxName} · elapsed {mm}:{ss}
      </p>
      <ol
        data-testid="finality-stages"
        className="mt-5 space-y-2"
        aria-live="polite"
        aria-label="Transaction stages"
      >
        {stages.map((stage, index) => {
          const done = index < stageIndex;
          const current = index === stageIndex;
          const label = done ? "done" : current ? "active" : "pending";
          return (
            <li key={stage} className="flex items-center gap-3 text-xs">
              <span
                className={
                  done || current ? "text-terminal-green" : "text-white/30"
                }
              >
                {label}
              </span>
              <span className={current ? "text-white" : "text-white/50"}>{stage}</span>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 border-l-2 border-terminal-orange pl-3 text-[11px] text-white/60">
        {FINALITY_KEEP_OPEN}
      </p>
      {slow && (
        <p className="mt-3 text-[11px] font-bold text-terminal-orange" role="status">
          {TAKING_LONGER}{" "}
          <a
            className="underline focus:outline-none focus:ring-2 focus:ring-white"
            href="mailto:support@phreaking.fun"
          >
            Contact support
          </a>
        </p>
      )}
      <p className="mt-3 text-[10px] uppercase tracking-widest text-white/30">
        Preview only. No transaction was submitted.
      </p>
    </div>
  );
}
