"use client";
import React, { useCallback, useState } from "react";
import Image from "next/image";
import GovernancePanel from "./GovernancePanel";

type LoadState = "idle" | "loading" | "ready" | "error";

interface PauseStateEntry {
  paused?: boolean;
  unpauseReleaseAt?: string;
  error?: string;
  message?: string;
  totalValueAtRiskUsd?: string;
}

interface DepositAggregate {
  count: number;
  native: string;
  erc20Transfers: number;
  erc20Tokens: number;
}

interface OnchainOverlay {
  anyPaused?: boolean;
  pauseState?: Record<string, PauseStateEntry>;
  deposits?:
    | Record<string, DepositAggregate>
    | { error: string; message?: string };
  depositsRead?: { note: string };
  failedTx?: {
    rate: number | null;
    attempted?: number;
    failed?: number;
    note?: string;
  };
  feesNote?: string;
  transfersNote?: string;
  revenue?: number | null;
  transfers?: number | null;
  error?: string;
  message?: string;
}

interface RetentionCohort {
  users: number;
  d1: number;
  d7: number;
  d30: number;
}

interface InsightsResponse {
  generatedAt?: string;
  windowDays?: number;
  wau?: Record<string, number>;
  newUsers?: number;
  activationRate?: number;
  activatedUsers?: number;
  funnels?: Record<string, Record<string, number>>;
  shareRate?: number;
  pageviews?: Record<string, number>;
  retentionCohorts?: Record<string, RetentionCohort>;
  channelMix?: Record<string, number>;
  campaignFunnel?: Record<string, number>;
  dataQuality?: Record<
    string,
    {
      accepted?: number;
      rejected?: number;
      droppedAttributes?: number;
      botFiltered?: number;
      blocked?: number;
    }
  >;
  onchainOverlay?: OnchainOverlay;
}

interface WaitlistStats {
  products?: Record<
    string,
    { counts: Record<string, number>; verification_rate?: number }
  >;
  suppressed_total?: number;
}

interface ModerationEntry {
  id: string;
  kind: "anonymous_id" | "ip_prefix" | "wallet";
  value: string;
  reason?: string;
  createdAt?: string;
  createdBy?: string;
}

interface ModerationAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  kind: string | null;
  value: string | null;
  reason?: string | null;
  actor?: string;
}

interface ModerationResponse {
  updatedAt?: string | null;
  entries?: ModerationEntry[];
  audit?: ModerationAuditEntry[];
}

const TOKEN_SESSION_KEY = "obs_admin_insights_token";
const WAITLIST_SESSION_KEY = "obs_admin_waitlist_token";
const MODERATION_SESSION_KEY = "obs_admin_moderation_token";

function latestWeekly(wau?: Record<string, number>): number | null {
  if (!wau) return null;
  const keys = Object.keys(wau).sort();
  if (!keys.length) return null;
  return wau[keys[keys.length - 1]] ?? null;
}

function pct(v?: number): string {
  if (typeof v !== "number") return "—";
  return `${Math.round(v * 100)}%`;
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-terminal-green-dark/20 border border-terminal-green-dark px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark">
        {label}
      </div>
      <div className="text-terminal-green text-lg leading-tight">{value}</div>
    </div>
  );
}

const AdminData = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [insightsToken, setInsightsToken] = useState("");
  const [waitlistToken, setWaitlistToken] = useState("");
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistStats | null>(null);
  const [moderationToken, setModerationToken] = useState("");
  const [moderationState, setModerationState] = useState<LoadState>("idle");
  const [moderationError, setModerationError] = useState<string | null>(null);
  const [moderation, setModeration] = useState<ModerationResponse | null>(null);
  const [moderationReceipt, setModerationReceipt] = useState<string | null>(null);
  const [moderationKind, setModerationKind] =
    useState<ModerationEntry["kind"]>("anonymous_id");
  const [moderationValue, setModerationValue] = useState("");
  const [moderationReason, setModerationReason] = useState("");

  const toggleCollapsed = () => setCollapsed((c) => !c);

  const load = useCallback(async () => {
    const it = insightsToken.trim();
    const wt = waitlistToken.trim();
    if (!it && !wt) {
      setError("Enter at least one admin token.");
      setState("error");
      return;
    }
    setState("loading");
    setError(null);
    setInsights(null);
    setWaitlist(null);

    let loaded = false;
    let unauthorized = false;

    if (it) {
      try {
        const res = await fetch("/api/insights?days=30&onchain=1", {
          headers: { authorization: `Bearer ${it}` },
          cache: "no-store",
        });
        if (res.status === 404) {
          unauthorized = true;
        } else if (res.ok) {
          setInsights(await res.json());
          sessionStorage.setItem(TOKEN_SESSION_KEY, it);
          loaded = true;
        } else {
          setError(`Insights API returned HTTP ${res.status}.`);
        }
      } catch {
        setError("Could not reach the insights API.");
      }
    }

    if (wt) {
      try {
        const res = await fetch("/api/waitlist/stats?product=pff", {
          headers: { authorization: `Bearer ${wt}` },
          cache: "no-store",
        });
        if (res.status === 404) {
          unauthorized = true;
        } else if (res.ok) {
          setWaitlist(await res.json());
          sessionStorage.setItem(WAITLIST_SESSION_KEY, wt);
          loaded = true;
        } else {
          setError(`Waitlist API returned HTTP ${res.status}.`);
        }
      } catch {
        setError("Could not reach the waitlist API.");
      }
    }

    if (loaded) {
      setState("ready");
    } else {
      if (unauthorized) {
        setError("Not authorized — wrong or missing admin token.");
      }
      setState("error");
    }
  }, [insightsToken, waitlistToken]);

  const loadModeration = useCallback(async () => {
    const mt = moderationToken.trim();
    if (!mt) {
      setModerationError("Enter the moderation admin token.");
      setModerationState("error");
      return;
    }
    setModerationState("loading");
    setModerationError(null);
    try {
      const res = await fetch("/api/moderation", {
        headers: { authorization: `Bearer ${mt}` },
        cache: "no-store",
      });
      if (res.status === 404) {
        setModerationError(
          "Not authorized — wrong or missing moderation token.",
        );
        setModerationState("error");
        return;
      }
      if (!res.ok) {
        setModerationError(`Moderation API returned HTTP ${res.status}.`);
        setModerationState("error");
        return;
      }
      setModeration(await res.json());
      sessionStorage.setItem(MODERATION_SESSION_KEY, mt);
      setModerationState("ready");
    } catch {
      setModerationError("Could not reach the moderation API.");
      setModerationState("error");
    }
  }, [moderationToken]);

  const submitModeration = useCallback(
    async (
      action: "ban" | "unban",
      payload: {
        kind?: ModerationEntry["kind"];
        value?: string;
        reason?: string;
        id?: string;
      },
    ) => {
      const mt = moderationToken.trim();
      if (!mt) {
        setModerationError("Enter the moderation admin token.");
        setModerationState("error");
        return;
      }
      setModerationState("loading");
      setModerationError(null);
      try {
        const res = await fetch("/api/moderation", {
          method: "POST",
          headers: {
            authorization: `Bearer ${mt}`,
            "content-type": "application/json",
          },
          cache: "no-store",
          body: JSON.stringify({ action, ...payload }),
        });
        if (res.status === 404) {
          setModerationError(
            "Not authorized — wrong or missing moderation token.",
          );
          setModerationState("error");
          return;
        }
        if (!res.ok) {
          setModerationError(`Moderation API returned HTTP ${res.status}.`);
          setModerationState("error");
          return;
        }
        setModeration(await res.json());
        setModerationState("ready");
        setModerationReceipt(
          `${action === "ban" ? "Banned" : "Unbanned"} ${payload.kind ?? "entry"}${
            payload.value ? ` ${payload.value}` : ""
          } — applied.`,
        );
        setTimeout(() => setModerationReceipt(null), 4000);
        if (action === "ban") {
          setModerationValue("");
          setModerationReason("");
        }
      } catch {
        setModerationError("Could not reach the moderation API.");
        setModerationState("error");
      }
    },
    [moderationToken],
  );

  const pff = waitlist?.products?.pff;
  const overlay = insights?.onchainOverlay;
  const deposits =
    overlay && overlay.deposits && !("error" in overlay.deposits)
      ? overlay.deposits
      : null;
  const totalDeposits = deposits
    ? Object.values(deposits).reduce((a, d) => a + (d.count || 0), 0)
    : null;

  return (
    <div className="relative w-full bg-terminal-black border border-terminal-green font-mono text-base text-terminal-white px-6 py-8 flex flex-col justify-center h-full">
      <span className="absolute top-0 left-0 w-4 h-4 z-10">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polygon points="0,0 16,0 0,16" fill="#22e584" />
        </svg>
      </span>
      <span className="absolute bottom-0 right-0 w-4 h-4 z-10">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polygon points="16,16 0,16 16,0" fill="#22e584" />
        </svg>
      </span>

      <button
        type="button"
        className="flex items-center gap-2 text-left"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-controls="admin-data-body"
      >
        <Image
          src="/collapsible.svg"
          alt=""
          width={12}
          height={12}
          style={{ width: "auto", height: "auto" }}
          className={`transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}
        />
        <h2 className="text-terminal-green">Administrator data</h2>
      </button>

      <div
        id="admin-data-body"
        className={`transition-all duration-300 ${collapsed ? "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden" : "opacity-100 translate-y-0 pointer-events-auto mt-4"}`}
      >
        <p className="text-[10px] text-terminal-green-dark leading-snug mb-3">
          Aggregates only — no wallet addresses are stored or returned. Tokens
          are held in this tab only. Full dashboard:{" "}
          <a className="text-terminal-green underline" href="/insights/">
            /insights/
          </a>{" "}
          ·{" "}
          <a className="text-terminal-green underline" href="/admin/">
            /admin/
          </a>
        </p>

        <div className="flex flex-col gap-2 mb-3">
          <label className="text-[10px] text-terminal-green-dark">
            Insights token
            <input
              type="password"
              value={insightsToken}
              onChange={(e) => setInsightsToken(e.target.value)}
              placeholder="INSIGHTS_TOKEN"
              autoComplete="off"
              className="mt-1 w-full bg-terminal-black border border-terminal-green-dark px-2 py-1 text-xs text-terminal-white placeholder:text-terminal-green-dark focus:border-terminal-green outline-none"
            />
          </label>
          <label className="text-[10px] text-terminal-green-dark">
            Waitlist token (optional)
            <input
              type="password"
              value={waitlistToken}
              onChange={(e) => setWaitlistToken(e.target.value)}
              placeholder="WAITLIST_ADMIN_TOKEN"
              autoComplete="off"
              className="mt-1 w-full bg-terminal-black border border-terminal-green-dark px-2 py-1 text-xs text-terminal-white placeholder:text-terminal-green-dark focus:border-terminal-green outline-none"
            />
          </label>
          <button
            type="button"
            onClick={load}
            disabled={state === "loading"}
            className="self-start border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state === "loading" ? "LOADING…" : "LOAD"}
          </button>
        </div>

        <div aria-live="polite" className="text-xs">
          {state === "error" && error && (
            <p className="text-terminal-red">{error}</p>
          )}
          {state === "ready" && (
            <p className="text-terminal-green">
              Authorized — showing last 30 days.
            </p>
          )}
        </div>

        {insights && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
              Traction
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="WAU" value={latestWeekly(insights.wau) ?? "—"} />
              <Kpi label="New users" value={insights.newUsers ?? "—"} />
              <Kpi
                label="Activation"
                value={pct(insights.activationRate)}
              />
              <Kpi label="Share rate" value={pct(insights.shareRate)} />
            </div>

            {overlay && (
              <>
                <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mt-3 mb-1">
                  On-chain
                </div>
                {overlay.error ? (
                  <p className="text-terminal-orange text-xs">
                    Overlay unavailable ({overlay.error}). No numbers shown.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Kpi
                      label="Contract state"
                      value={overlay.anyPaused ? "PAUSED" : "LIVE"}
                    />
                    <Kpi label="Deposits" value={totalDeposits ?? "—"} />
                    <Kpi
                      label="Failed tx rate"
                      value={
                        overlay.failedTx?.rate == null
                          ? "—"
                          : pct(overlay.failedTx.rate)
                      }
                    />
                    <Kpi
                      label="Revenue / fees"
                      value={
                        overlay.revenue == null ? "not tracked" : overlay.revenue
                      }
                    />
                  </div>
                )}
                {overlay.feesNote && (
                  <p className="text-[10px] text-terminal-green-dark mt-2 leading-snug">
                    {overlay.feesNote}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {pff && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
              Waitlist (pff)
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Kpi label="Verified" value={pff.counts?.verified ?? "—"} />
              <Kpi label="Pending" value={pff.counts?.pending ?? "—"} />
              <Kpi label="Verify rate" value={pct(pff.verification_rate)} />
              <Kpi label="Suppressed" value={waitlist?.suppressed_total ?? "—"} />
            </div>
          </div>
        )}

        {insights?.funnels?.pff && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
              App funnel (pff)
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(insights.funnels.pff).map(([step, count]) => (
                <Kpi key={step} label={step.replace(/_/g, " ")} value={count} />
              ))}
            </div>
          </div>
        )}

        {insights?.retentionCohorts &&
          Object.keys(insights.retentionCohorts).length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
                Retention cohorts
              </div>
              <div className="flex flex-col gap-1 text-[10px]">
                {Object.entries(insights.retentionCohorts)
                  .sort(([a], [b]) => (a < b ? 1 : -1))
                  .slice(0, 6)
                  .map(([day, cohort]) => (
                    <div
                      key={day}
                      className="flex items-center justify-between border border-terminal-green-dark/40 px-2 py-1"
                    >
                      <span className="text-terminal-green">{day}</span>
                      <span className="text-terminal-white">
                        {cohort.users} users · D1 {cohort.d1} · D7 {cohort.d7} ·
                        D30 {cohort.d30}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

        {insights?.channelMix && Object.keys(insights.channelMix).length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
              Channel mix
            </div>
            <div className="flex flex-col gap-1 text-[10px]">
              {Object.entries(insights.channelMix)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([channel, users]) => (
                  <div
                    key={channel}
                    className="flex items-center justify-between border border-terminal-green-dark/40 px-2 py-1"
                  >
                    <span className="text-terminal-green">{channel}</span>
                    <span className="text-terminal-white">{users} users</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {insights?.campaignFunnel &&
          Object.keys(insights.campaignFunnel).length > 0 && (
            <div className="mt-3">
              <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
                Campaign funnel
              </div>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(insights.campaignFunnel).map(([step, count]) => (
                  <Kpi
                    key={step}
                    label={step.replace(/^c_/, "C").replace(/_/g, " ")}
                    value={count}
                  />
                ))}
              </div>
            </div>
          )}

        {overlay?.pauseState && Object.keys(overlay.pauseState).length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
              Contracts
            </div>
            <div className="flex flex-col gap-1 text-[10px]">
              {Object.entries(overlay.pauseState).map(([name, s]) => (
                <div
                  key={name}
                  className="flex items-center justify-between border border-terminal-green-dark/40 px-2 py-1"
                >
                  <span className="text-terminal-green">{name}</span>
                  <span className="text-terminal-green-dark">
                    VaR (1e8 USD) {s.totalValueAtRiskUsd ?? "—"}
                  </span>
                  <span
                    className={
                      s.error
                        ? "text-terminal-orange"
                        : s.paused
                          ? "text-terminal-red"
                          : "text-terminal-green"
                    }
                  >
                    {s.error ? "read-failed" : s.paused ? "PAUSED" : "LIVE"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {deposits && Object.keys(deposits).length > 0 && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
              Deposits by box
            </div>
            <div className="flex flex-col gap-1 text-[10px]">
              {Object.entries(deposits).map(([name, d]) => (
                <div
                  key={name}
                  className="flex items-center justify-between border border-terminal-green-dark/40 px-2 py-1"
                >
                  <span className="text-terminal-green">{name}</span>
                  <span className="text-terminal-white">
                    {d.count} deposits · {d.native} ETH · {d.erc20Transfers} ERC20
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 border-t border-terminal-green-dark/40 pt-4">
          <div className="text-[10px] uppercase tracking-wider text-terminal-green-dark mb-1">
            Moderation
          </div>
          <p className="text-[10px] text-terminal-green-dark leading-snug mb-2">
            Ban anonymous IDs and IP prefixes at the collector. Wallet entries
            are kept for app-level enforcement and are never written to the
            analytics store. Requires a moderation admin token.
          </p>

          <div className="flex flex-col gap-2 mb-2">
            <label className="text-[10px] text-terminal-green-dark">
              Moderation admin token
              <input
                type="password"
                value={moderationToken}
                onChange={(e) => setModerationToken(e.target.value)}
                placeholder="MODERATION_ADMIN_TOKEN"
                autoComplete="off"
                className="mt-1 w-full bg-terminal-black border border-terminal-green-dark px-2 py-1 text-xs text-terminal-white placeholder:text-terminal-green-dark focus:border-terminal-green outline-none"
              />
            </label>
            <button
              type="button"
              onClick={loadModeration}
              disabled={moderationState === "loading"}
              className="self-start border border-terminal-green px-3 py-1 text-xs text-terminal-green hover:bg-terminal-green-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {moderationState === "loading" ? "LOADING…" : "LOAD BLOCKLIST"}
            </button>
          </div>

          <div aria-live="polite" className="text-xs">
            {moderationState === "error" && moderationError && (
              <p className="text-terminal-red">{moderationError}</p>
            )}
            {moderationReceipt && (
              <p className="text-terminal-green" role="status">
                {moderationReceipt}
              </p>
            )}
          </div>

          {moderationState === "ready" && moderation && (
            <>
              <div className="text-[10px] text-terminal-green-dark mt-2 mb-1">
                Entries ({moderation.entries?.length ?? 0})
              </div>
              <div className="flex flex-col gap-1 text-[10px]">
                {(moderation.entries ?? []).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-2 border border-terminal-green-dark/40 px-2 py-1"
                  >
                    <span className="text-terminal-green shrink-0">
                      {entry.kind}
                    </span>
                    <span className="text-terminal-white truncate">
                      {entry.value}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        submitModeration("unban", {
                          id: entry.id,
                          kind: entry.kind,
                          value: entry.value,
                        })
                      }
                      className="shrink-0 border border-terminal-red px-2 text-terminal-red hover:bg-terminal-red/10 disabled:opacity-40"
                    >
                      UNBAN
                    </button>
                  </div>
                ))}
                {(moderation.entries ?? []).length === 0 && (
                  <p className="text-terminal-green-dark">No entries.</p>
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <label className="text-[10px] text-terminal-green-dark">
                  Entry kind
                  <select
                    value={moderationKind}
                    onChange={(e) =>
                      setModerationKind(e.target.value as ModerationEntry["kind"])
                    }
                    className="mt-1 w-full bg-terminal-black border border-terminal-green-dark px-2 py-1 text-xs text-terminal-white focus:border-terminal-green outline-none"
                  >
                    <option value="anonymous_id">anonymous_id</option>
                    <option value="ip_prefix">ip_prefix</option>
                    <option value="wallet">wallet</option>
                  </select>
                </label>
                <label className="text-[10px] text-terminal-green-dark">
                  Value
                  <input
                    type="text"
                    value={moderationValue}
                    onChange={(e) => setModerationValue(e.target.value)}
                    placeholder="UUID · IP prefix · 0x wallet"
                    autoComplete="off"
                    className="mt-1 w-full bg-terminal-black border border-terminal-green-dark px-2 py-1 text-xs text-terminal-white placeholder:text-terminal-green-dark focus:border-terminal-green outline-none"
                  />
                </label>
                <label className="text-[10px] text-terminal-green-dark">
                  Reason (optional)
                  <input
                    type="text"
                    value={moderationReason}
                    onChange={(e) => setModerationReason(e.target.value)}
                    placeholder="why this entry exists"
                    autoComplete="off"
                    className="mt-1 w-full bg-terminal-black border border-terminal-green-dark px-2 py-1 text-xs text-terminal-white placeholder:text-terminal-green-dark focus:border-terminal-green outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    submitModeration("ban", {
                      kind: moderationKind,
                      value: moderationValue,
                      reason: moderationReason,
                    })
                  }
                  disabled={moderationValue.trim() === ""}
                  className="self-start border border-terminal-red px-3 py-1 text-xs text-terminal-red hover:bg-terminal-red/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  BAN
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6">
          <GovernancePanel />
        </div>
      </div>
    </div>
  );
};

export default AdminData;
