"use client";

import React, {
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeftRight,
  Bitcoin,
  Check,
  ChevronRight,
  Crown,
  Dices,
  Flag,
  Gamepad2,
  Gem,
  Gift,
  Grid2x2,
  HeartHandshake,
  Image as ImageIcon,
  Layers,
  Lock,
  Recycle,
  ShieldAlert,
  Skull,
  Sparkles,
  X,
} from "lucide-react";
import {
  BOXES,
  BOXES_BY_TOOLKIT,
  DEMO_CHARITIES,
  TOOLKITS,
  WHITE_BOX_RECEIPT_LANGUAGE,
} from "./catalog";
import { BoxDefinition, BoxToggle, DemoResult } from "./types";

type Step = "configure" | "review" | "sign" | "finality" | "result" | "error";

interface AssetRow {
  token: string;
  amount: string;
}

const ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  gift: Gift,
  swap: ArrowLeftRight,
  layers: Layers,
  recycle: Recycle,
  bitcoin: Bitcoin,
  image: ImageIcon,
  heart: HeartHandshake,
  skull: Skull,
  shuffle: Dices,
  grid: Grid2x2,
  flag: Flag,
  crown: Crown,
  sparkles: Sparkles,
  gem: Gem,
  gamepad: Gamepad2,
};

const TOKENS = ["ETH", "USDC", "LINK", "WBTC", "BAX", "RIO", "GFI", "wTHT"];

const PRICES: Record<string, number> = {
  ETH: 3200,
  USDC: 1,
  LINK: 14,
  WBTC: 63000,
  BAX: 0.42,
  RIO: 1.8,
  GFI: 1.5,
  wTHT: 1.25,
};

const DEMO_NFTS = [
  { id: "harold-4821", name: "Hide The Pain Harold #4821", floor: "$184.00" },
  { id: "punks-912", name: "Sepolia Punks #912", floor: "$96.00" },
  { id: "ape-44", name: "Test Ape #44", floor: "$61.00" },
  { id: "mfer-77", name: "MFER #77", floor: "$42.00" },
  { id: "orb-3", name: "Orbital #3", floor: "$28.00" },
  { id: "grid-8", name: "Gridworks #8", floor: "$19.00" },
];

const SWEEP_ASSETS = [
  { symbol: "ETH", amount: "0.412", usd: "$1,318.40" },
  { symbol: "USDC", amount: "284.00", usd: "$284.00" },
  { symbol: "LINK", amount: "12.00", usd: "$168.00" },
  { symbol: "BAX", amount: "172.00", usd: "$72.20" },
];

const STAGE_LABELS: Record<string, string> = {
  SUBMITTED: "Submitted to the network",
  ROUTING: "Routing the deposit",
  BRIDGING: "Bridging to the destination chain",
  SWAPPING: "Executing the swap",
  SETTLING: "Settling the output",
  FINALIZED: "Finalized",
  SCREENING: "Screening receipts",
  "SWAPPING TO USDC": "Swapping to USDC",
  DONATING: "Sending the donation",
  SWEEPING: "Sweeping wallet assets",
  VALUING: "Valuing the swept assets",
  "MINTING NFT": "Minting the Harold NFT",
  "FIRING RANDOM BOX": "Firing a random box",
  ESCROWING: "Escrowing your portfolio",
  "WAITING FOR COUNTERPARTY": "Waiting for a counterparty",
  "CONVERTING TO USDC": "Converting to USDC",
  "OPENING GMX POSITION": "Opening the GMX position",
  "POSITION OPEN": "Position open",
  "TWAP FILL": "Filling over 24 hours",
  GRABBING: "Grabbing a ball",
  DELIVERING: "Delivering the coin",
};

function defaultToggles(box: BoxDefinition): Record<string, string> {
  const values: Record<string, string> = {};
  box.toggles?.forEach((toggle) => {
    values[toggle.id] = toggle.options[0].id;
  });
  return values;
}

function usdValue(token: string, amount: string): number {
  const price = PRICES[token] ?? 0;
  const parsed = Number(amount);
  if (!Number.isFinite(parsed)) return 0;
  return price * parsed;
}

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function getStages(box: BoxDefinition, toggles: Record<string, string>): string[] {
  switch (box.flowKind) {
    case "fixed-swap":
      return [
        "SUBMITTED",
        "ROUTING",
        ...(toggles.route === "cross-chain" ? ["BRIDGING"] : []),
        "SWAPPING",
        "FINALIZED",
      ];
    case "portfolio-offer":
      return ["SUBMITTED", "ROUTING", "SWAPPING", "SETTLING", "FINALIZED"];
    case "recycle":
      return ["SUBMITTED", "SCREENING", "SWAPPING", "FINALIZED"];
    case "donation":
      return ["SUBMITTED", "ROUTING", "SWAPPING TO USDC", "DONATING", "FINALIZED"];
    case "wallet-sweep":
      return ["SUBMITTED", "SWEEPING", "VALUING", "MINTING NFT", "FINALIZED"];
    case "random-box":
      return ["SUBMITTED", "FIRING RANDOM BOX", "ROUTING", "SWAPPING", "FINALIZED"];
    case "portfolio-match":
      return [
        "SUBMITTED",
        "ESCROWING",
        "WAITING FOR COUNTERPARTY",
        "SETTLING",
        "FINALIZED",
      ];
    case "leveraged-trade":
      return ["SUBMITTED", "CONVERTING TO USDC", "OPENING GMX POSITION", "POSITION OPEN"];
    case "mirror":
      return [
        "SUBMITTED",
        "ROUTING",
        ...(box.id === "diamond" ? ["TWAP FILL"] : []),
        "SETTLING",
        "FINALIZED",
      ];
    case "gatcha":
      return ["SUBMITTED", "GRABBING", "SWAPPING", "DELIVERING", "FINALIZED"];
    default:
      return ["SUBMITTED", "ROUTING", "SWAPPING", "SETTLING", "FINALIZED"];
  }
}

function ExplorerLinks({ result }: { result: DemoResult }) {
  const primary = result.assets[0];
  const showTokenLinks =
    !!primary &&
    !["USD SWEPT", "POSITION"].includes(primary.symbol) &&
    !!(result.coingecko || result.dexscreener);

  return (
    <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-3">
      {primary && showTokenLinks && result.coingecko && (
        <a
          className="border border-white/20 px-3 py-2 text-center text-terminal-green hover:border-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
          href={`https://www.coingecko.com/en/search?query=${encodeURIComponent(primary.symbol)}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          VIEW ON COINGECKO
        </a>
      )}
      {primary && showTokenLinks && result.dexscreener && (
        <a
          className="border border-white/20 px-3 py-2 text-center text-terminal-green hover:border-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
          href={`https://dexscreener.com/search?q=${encodeURIComponent(primary.symbol)}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          VIEW ON DEXSCREENER
        </a>
      )}
      <a
        className="border border-white/20 px-3 py-2 text-center text-terminal-green hover:border-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
        href="https://sepolia.etherscan.io/"
        target="_blank"
        rel="noreferrer noopener"
      >
        VIEW TRANSACTION
      </a>
    </div>
  );
}

function HaroldNftCard({ result }: { result: DemoResult }) {
  return (
    <div className="mt-4 border border-white/30 bg-[#111] p-3">
      <div className="relative overflow-hidden border border-white/20 bg-[#1b1b1b]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.12) 3px, rgba(255,255,255,0.12) 4px)",
          }}
        />
        <span className="absolute right-2 top-2 z-10 border border-white/40 bg-black/80 px-2 py-1 text-[10px] font-bold tracking-widest text-white">
          {result.assets[0]?.amount ?? "$0.00"}
        </span>
        <div className="relative flex h-44 flex-col items-center justify-center gap-2 px-6 text-center">
          <Skull size={44} className="text-white/70" />
          <p className="text-sm font-bold tracking-[0.3em] text-white">
            HIDE THE PAIN
          </p>
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            NFT art placeholder — final collection art to be supplied
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
        <span className="text-white/70">{result.headline}</span>
        <span className="text-white">
          VALUE AT SWEEP: {result.assets[0]?.amount}
        </span>
      </div>
    </div>
  );
}

function ResultView({ box }: { box: BoxDefinition }) {
  const result = box.demo;
  const primary = result.assets[0];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-terminal-green">
        {result.eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-bold text-white">{result.headline}</h3>

      {result.triggeredBox && (
        <p className="mt-2 inline-block border border-white/30 px-2 py-1 text-[10px] uppercase tracking-widest text-white/80">
          Triggered box: {result.triggeredBox}
        </p>
      )}

      {box.resultKind === "harold-nft" ? (
        <HaroldNftCard result={result} />
      ) : (
        <div className="mt-4 divide-y divide-white/10 border border-white/15">
          {result.assets.map((asset) => (
            <div
              key={`${asset.symbol}-${asset.amount}`}
              className="flex items-center justify-between gap-4 px-3 py-2"
            >
              <div>
                <p className="text-sm font-bold text-white">{asset.symbol}</p>
                <p className="text-[10px] uppercase tracking-widest text-white/40">
                  {box.resultKind === "position" ? "Position value" : "Received"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-terminal-green">{asset.amount}</p>
                <p className="text-[10px] text-white/50">{asset.usd}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <dl className="mt-4 space-y-1 text-[11px]">
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">ROUTE</dt>
          <dd className="text-right text-white/80">{result.route}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">TX HASH</dt>
          <dd className="text-right text-white/50">demo — not broadcast</dd>
        </div>
        {box.id === "russian-flag" && (
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">EXPIRES IN</dt>
            <dd className="text-right text-terminal-orange">23:59:59</dd>
          </div>
        )}
      </dl>

      <p className="mt-3 border-l-2 border-white/20 pl-3 text-[11px] leading-relaxed text-white/60">
        {result.note}
      </p>

      <ExplorerLinks result={result} />

      {primary?.symbol && (
        <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
          Prototype data. No token was received and no transaction exists.
        </p>
      )}
    </div>
  );
}

function StepRail({ step, box }: { step: Step; box: BoxDefinition }) {
  const steps: { id: Step; label: string }[] = [
    { id: "configure", label: "01 CONFIGURE" },
    { id: "review", label: "02 REVIEW" },
    { id: "sign", label: "03 SIGN" },
    { id: "finality", label: "04 FINALITY" },
    { id: "result", label: box.resultKind === "position" ? "OPEN" : "DONE" },
  ];
  const activeIndex = steps.findIndex((item) => item.id === step);
  return (
    <ol className="flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-widest">
      {steps.map((item, index) => {
        const active = item.id === step;
        const done = activeIndex > -1 && index < activeIndex;
        return (
          <li
            key={item.id}
            aria-current={active ? "step" : undefined}
            className={
              active
                ? "text-terminal-green"
                : done
                  ? "text-white/60"
                  : "text-white/25"
            }
          >
            {done ? "✓ " : ""}
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

function ToggleControl({
  toggle,
  value,
  onChange,
}: {
  toggle: BoxToggle;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = toggle.options.find((option) => option.id === value);
  return (
    <div className="mt-4">
      <p className="mb-1 text-[10px] uppercase tracking-widest text-white/40">
        {toggle.label}
      </p>
      <div
        role="group"
        aria-label={toggle.label}
        className="grid grid-cols-2 border border-white/20"
      >
        {toggle.options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className={`px-3 py-2 text-[11px] font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-white ${
                active
                  ? "bg-white text-black"
                  : "text-white/60 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {selected && <p className="mt-1 text-[11px] text-white/50">{selected.help}</p>}
    </div>
  );
}

function AssetEditor({
  rows,
  setRows,
  multi,
}: {
  rows: AssetRow[];
  setRows: (rows: AssetRow[]) => void;
  multi: boolean;
}) {
  const update = (index: number, patch: Partial<AssetRow>) => {
    setRows(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const add = () => {
    if (rows.length < 4) setRows([...rows, { token: "USDC", amount: "" }]);
  };

  const remove = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          You send
        </p>
        <p className="text-[10px] text-white/30">Sepolia balances (demo)</p>
      </div>
      {rows.map((row, index) => {
        const value = usdValue(row.token, row.amount);
        return (
          <div key={index} className="flex gap-2">
            <select
              aria-label={`Asset ${index + 1}`}
              value={row.token}
              onChange={(event) => update(index, { token: event.target.value })}
              className="w-28 border border-white/20 bg-black px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
            >
              {TOKENS.map((token) => (
                <option key={token} value={token}>
                  {token}
                </option>
              ))}
            </select>
            <input
              aria-label={`Amount of ${row.token}`}
              inputMode="decimal"
              placeholder="0.00"
              value={row.amount}
              onChange={(event) => update(index, { amount: event.target.value })}
              className="min-w-0 flex-1 border border-white/20 bg-black px-3 py-2 text-xs text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-white"
            />
            <div className="flex w-24 items-center justify-end text-[10px] text-white/50">
              {value > 0 ? formatUsd(value) : "—"}
            </div>
            {multi && rows.length > 1 && (
              <button
                type="button"
                aria-label={`Remove ${row.token}`}
                onClick={() => remove(index)}
                className="px-2 text-white/40 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        );
      })}
      {multi && (
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= 4}
          className="mt-1 border border-white/20 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 hover:border-white disabled:cursor-not-allowed disabled:opacity-30 focus:outline-none focus:ring-2 focus:ring-white"
        >
          + Add token ({rows.length}/4)
        </button>
      )}
    </div>
  );
}

function SweepList({ total }: { total: number }) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-white/40">
          Entire wallet — all supported EVM chains
        </p>
        <p className="text-[10px] text-terminal-orange">DEMO BALANCES</p>
      </div>
      <div className="mt-2 divide-y divide-white/10 border border-white/15">
        {SWEEP_ASSETS.map((asset) => (
          <div
            key={asset.symbol}
            className="flex items-center justify-between px-3 py-2 text-xs"
          >
            <span className="text-white">{asset.symbol}</span>
            <span className="text-white/50">{asset.amount}</span>
            <span className="text-white/70">{asset.usd}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between border border-white/30 px-3 py-2 text-xs">
        <span className="uppercase tracking-widest text-white/50">
          Total swept value
        </span>
        <span className="font-bold text-terminal-green">{formatUsd(total)}</span>
      </div>
    </div>
  );
}

function NftGrid({
  selected,
  setSelected,
}: {
  selected: string[];
  setSelected: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  };
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {DEMO_NFTS.map((nft) => {
        const active = selected.includes(nft.id);
        return (
          <button
            key={nft.id}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(nft.id)}
            className={`border p-2 text-left focus:outline-none focus:ring-2 focus:ring-white ${
              active
                ? "border-terminal-green bg-terminal-green/10"
                : "border-white/15 hover:border-white/50"
            }`}
          >
            <div className="mb-2 flex h-14 items-center justify-center bg-white/5">
              <ImageIcon size={20} className="text-white/50" />
            </div>
            <p className="truncate text-[10px] text-white">{nft.name}</p>
            <p className="text-[10px] text-white/40">Floor {nft.floor}</p>
          </button>
        );
      })}
    </div>
  );
}

function QuotePanel({
  total,
  box,
  toggles,
  tokens,
}: {
  total: number;
  box: BoxDefinition;
  toggles: Record<string, string>;
  tokens: string[];
}) {
  const route =
    box.id === "red" && toggles.route === "cross-chain"
      ? "Sepolia -> Axelar -> destination chain"
      : box.id === "red"
        ? "Sepolia (native)"
        : box.demo.route;
  return (
    <div className="mt-4 border border-white/15 bg-white/[0.02] p-3 text-[11px]">
      <div className="flex justify-between gap-3">
        <span className="text-white/40">EST. RECEIVE</span>
        <span className="text-right text-white">
          {box.flowKind === "random-swap" || box.flowKind === "random-box"
            ? "??? — random pool token"
            : box.demo.assets.map((asset) => `${asset.amount} ${asset.symbol}`).join(" + ")}
        </span>
      </div>
      <div className="mt-1 flex justify-between gap-3">
        <span className="text-white/40">DEPOSIT VALUE</span>
        <span className="text-right text-white">{formatUsd(total)}</span>
      </div>
      <div className="mt-1 flex justify-between gap-3">
        <span className="text-white/40">ROUTE</span>
        <span className="text-right text-white/70">{route}</span>
      </div>
      <div className="mt-1 flex justify-between gap-3">
        <span className="text-white/40">NETWORK FEE</span>
        <span className="text-right text-white/70">
          0.0012 ETH + 5% premium
        </span>
      </div>
      <div className="mt-1 flex justify-between gap-3">
        <span className="text-white/40">PLATFORM FEE</span>
        <span className="text-right text-white/70">5% of output</span>
      </div>
      <div className="mt-1 flex justify-between gap-3">
        <span className="text-white/40">QUOTE EXPIRES</span>
        <span className="text-right text-terminal-orange">
          00:47 {tokens.length > 0 ? "" : "— add an asset first"}
        </span>
      </div>
    </div>
  );
}

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-terminal-red">
        TRANSACTION FAILED
      </p>
      <h3 className="mt-2 text-xl font-bold text-white">
        Transaction reverted. Your deposit was not taken.
      </h3>
      <div className="mt-4 border border-terminal-red/60 bg-terminal-red/10 p-3 text-[11px] leading-relaxed text-white/80">
        The contract rejected the swap before any tokens left your wallet. Nothing
        was charged. You can review the inputs and try again.
      </div>
      <dl className="mt-4 space-y-1 text-[11px]">
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">ERROR CLASS</dt>
          <dd className="text-white/70">Reverted</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-white/40">SUPPORT REFERENCE</dt>
          <dd className="text-white/50">BOX-04 / demo / no tx hash</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 w-full border border-white/30 px-4 py-2 text-xs font-bold tracking-widest text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
      >
        BACK TO CONFIGURE
      </button>
    </div>
  );
}

export default function BoxFlowPrototype() {
  const [selectedId, setSelectedId] = useState<BoxDefinition["id"] | null>(null);
  const [step, setStep] = useState<Step>("configure");
  const [connected, setConnected] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [rows, setRows] = useState<AssetRow[]>([{ token: "ETH", amount: "" }]);
  const [toggles, setToggles] = useState<Record<string, string>>({});
  const [ack, setAck] = useState(false);
  const [ackError, setAckError] = useState(false);
  const [nftSelected, setNftSelected] = useState<string[]>([]);
  const [charityMode, setCharityMode] = useState("random");
  const [charity, setCharity] = useState(DEMO_CHARITIES[0]);
  const [machine, setMachine] = useState("$10");
  const [signing, setSigning] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [hiddenFinality, setHiddenFinality] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const selected = selectedId
    ? BOXES.find((box) => box.id === selectedId) ?? null
    : null;

  const accent = selected?.accent ?? "#22E584";

  const total = useMemo(() => {
    if (!selected) return 0;
    if (selected.assetMode === "wallet") {
      return SWEEP_ASSETS.reduce(
        (sum, asset) => sum + Number(asset.usd.replace(/[^0-9.]/g, "")),
        0,
      );
    }
    if (selected.flowKind === "gatcha") {
      return Number(machine.replace(/[^0-9.]/g, ""));
    }
    return rows.reduce((sum, row) => sum + usdValue(row.token, row.amount), 0);
  }, [rows, selected, machine]);

  const stages = useMemo(
    () => (selected ? getStages(selected, toggles) : []),
    [selected, toggles],
  );

  const openBox = (box: BoxDefinition) => {
    setSelectedId(box.id);
    setStep("configure");
    setRows([
      { token: "ETH", amount: "" },
    ]);
    setToggles(defaultToggles(box));
    setAck(false);
    setAckError(false);
    setNftSelected([]);
    setCharityMode("random");
    setCharity(DEMO_CHARITIES[0]);
    setMachine("$10");
    setSigning(false);
    setStageIndex(0);
    setElapsed(0);
    setHiddenFinality(false);
    setNotice(null);
  };

  const closeFlow = () => {
    setSelectedId(null);
    setStep("configure");
    setHiddenFinality(false);
    setSigning(false);
    setNotice(null);
  };

  const setToggle = (id: string, value: string) => {
    setToggles((current) => ({ ...current, [id]: value }));
    setNotice("Quote updated for the new routing choice.");
  };

  useEffect(() => {
    if (step !== "finality" || !selected) return;
    setStageIndex(0);
    setElapsed(0);
    const stageTimers = stages.map((_, index) =>
      window.setTimeout(() => setStageIndex(index), 350 + index * 850),
    );
    const doneTimer = window.setTimeout(
      () => setStep("result"),
      350 + stages.length * 850,
    );
    return () => {
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(doneTimer);
    };
  }, [step, selected, stages]);

  useEffect(() => {
    if (step !== "finality") return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [step]);

  useEffect(() => {
    if (step === "result") setHiddenFinality(false);
  }, [step]);

  useEffect(() => {
    if (!selected) return;
    dialogRef.current?.focus();
  }, [selectedId, selected]);

  useEffect(() => {
    if (!signing) return;
    const timer = window.setTimeout(() => {
      setSigning(false);
      setStep("finality");
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [signing]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (step === "finality") {
          setHiddenFinality(true);
        } else if (!signing) {
          closeFlow();
        }
      }
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, step, signing]);

  const ready = useMemo(() => {
    if (!selected) return false;
    if (selected.status === "locked") return false;
    if (selected.assetMode === "wallet" || selected.assetMode === "none") {
      return true;
    }
    if (selected.assetMode === "nft") {
      return nftSelected.length > 0;
    }
    return rows.some((row) => Number(row.amount) > 0);
  }, [selected, rows, nftSelected]);

  const goReview = () => {
    if (!connected) {
      setShowConnect(true);
      return;
    }
    setNotice(null);
    setStep("review");
  };

  const startSigning = (wallet: string) => {
    setWalletName(wallet);
    setSigning(true);
    setNotice(null);
  };

  const rejectSignature = () => {
    setSigning(false);
    setStep("review");
    setNotice("Signature cancelled. Nothing was sent.");
  };

  const reviewPrimary = () => {
    if (!connected) {
      setShowConnect(true);
      return;
    }
    if (selected?.requiresAcknowledgement && !ack) {
      setAckError(true);
      return;
    }
    setStep("sign");
  };

  const resetToConfigure = () => {
    setStep("configure");
    setNotice(null);
    setAck(false);
    setAckError(false);
  };

  const edgeStyle: CSSProperties = selected
    ? {
        boxShadow: `inset 0 0 160px ${accent}30`,
      }
    : {};

  const primaryLabel = !connected
    ? "CONNECT WALLET TO CONTINUE"
    : selected?.status === "locked"
      ? "UNLOCK REQUIRED"
      : "REVIEW DEPOSIT";

  const renderConfigure = (box: BoxDefinition) => {
    if (box.status === "locked") {
      return (
        <div className="border border-white/20 bg-white/[0.02] p-4">
          <div className="flex items-center gap-3">
            <Lock size={20} className="text-white/70" />
            <div>
              <p className="text-sm font-bold text-white">
                Vibe Toolkit locked
              </p>
              <p className="text-[11px] text-white/50">
                Stake 10,000 UNITE to unlock this mirror.
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 text-[11px] sm:grid-cols-2">
            <div className="border border-white/10 px-3 py-2 text-white/50">
              YOUR UNITE: 0
            </div>
            <div className="border border-white/10 px-3 py-2 text-white/50">
              REQUIRED: 10,000 UNITE
            </div>
          </div>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed border border-white/15 px-4 py-2 text-xs tracking-widest text-white/30"
          >
            STAKING IS NOT LIVE ON SEPOLIA
          </button>
        </div>
      );
    }

    const isWalletFlow =
      box.assetMode === "wallet" || box.flowKind === "portfolio-match";

    return (
      <>
        {box.toggles?.map((toggle) => (
          <ToggleControl
            key={toggle.id}
            toggle={toggle}
            value={toggles[toggle.id] ?? toggle.options[0].id}
            onChange={(value) => setToggle(toggle.id, value)}
          />
        ))}

        {isWalletFlow && <SweepList total={total} />}

        {box.flowKind === "donation" && (
          <>
            <ToggleControl
              toggle={{
                id: "charity-mode",
                label: "Charity selection",
                options: [
                  {
                    id: "random",
                    label: "RANDOM CHARITY",
                    help: "TheGivingBlock selects an eligible charity at execution.",
                  },
                  {
                    id: "choose",
                    label: "CHOOSE CHARITY",
                    help: "Pin a specific eligible charity for this donation.",
                  },
                ],
              }}
              value={charityMode}
              onChange={(value) => setCharityMode(value)}
            />
            {charityMode === "choose" && (
              <label className="mt-3 block text-[10px] uppercase tracking-widest text-white/40">
                Recipient
                <select
                  value={charity}
                  onChange={(event) => setCharity(event.target.value)}
                  className="mt-1 w-full border border-white/20 bg-black px-2 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {DEMO_CHARITIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}

        {box.flowKind === "gatcha" && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Machine
            </p>
            <div role="group" aria-label="Machine price" className="mt-1 grid grid-cols-3 gap-2">
              {["$1", "$10", "$100"].map((price) => {
                const active = machine === price;
                return (
                  <button
                    key={price}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMachine(price)}
                    className={`border px-3 py-3 text-center focus:outline-none focus:ring-2 focus:ring-white ${
                      active
                        ? "border-terminal-green bg-terminal-green/10 text-white"
                        : "border-white/20 text-white/60 hover:border-white"
                    }`}
                  >
                    <span className="block text-lg font-bold">{price}</span>
                    <span className="text-[9px] uppercase tracking-widest">
                      per grab
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-white/50">
              32 balls loaded. Top prize on this machine: 1.45 LINK. Inventory is
              static and pre-funded.
            </p>
          </div>
        )}

        {box.flowKind === "nft-swap" && toggles.mode === "nft-to-alt" && (
          <NftGrid selected={nftSelected} setSelected={setNftSelected} />
        )}

        {(box.assetMode === "single" ||
          box.assetMode === "multi" ||
          (box.flowKind === "nft-swap" && toggles.mode !== "nft-to-alt")) && (
          <AssetEditor
            rows={rows}
            setRows={setRows}
            multi={box.assetMode === "multi"}
          />
        )}

        {box.flowKind === "recycle" && (
          <div className="mt-3 space-y-1 border border-white/15 p-3 text-[11px]">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Receipt screening
            </p>
            <div className="flex items-center justify-between">
              <span className="text-white/70">Contract age &lt; 2 years</span>
              <span className="text-terminal-green">PASS</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70">90-day avg volume ≥ $100k</span>
              <span className="text-terminal-green">PASS</span>
            </div>
            <p className="text-[10px] text-white/35">
              Screening is not an endorsement.
            </p>
          </div>
        )}

        {box.flowKind === "portfolio-offer" && (
          <div className="mt-3 border border-white/25 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Offer for the lot
              </p>
              <p className="text-[10px] text-terminal-orange">EXPIRES 00:47</p>
            </div>
            <p className="mt-1 text-sm text-white">
              {formatUsd(total)} → XCM + RIO + LINK
            </p>
            <p className="text-[11px] text-white/50">
              Slippage band ±1%. Accept the offer to continue.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setNotice("Offer accepted. Continue to review to sign.")}
                className="flex-1 border border-terminal-green px-3 py-1.5 text-[10px] uppercase tracking-widest text-terminal-green hover:bg-terminal-green/10 focus:outline-none focus:ring-2 focus:ring-white"
              >
                Accept offer
              </button>
              <button
                type="button"
                onClick={() => setNotice("New offer requested. Quote refreshed.")}
                className="flex-1 border border-white/25 px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/70 hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                Request new offer
              </button>
            </div>
          </div>
        )}

        {box.flowKind === "leveraged-trade" && (
          <div className="mt-3 border border-white/15 p-3 text-[11px]">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              24-hour position rules
            </p>
            <div className="mt-1 flex justify-between text-white/70">
              <span>Basket</span>
              <span>ETH · SOL · LINK · AAVE · TON · XMR</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Direction</span>
              <span>Random long or short (1 in 6 short)</span>
            </div>
            <div className="flex justify-between text-white/70">
              <span>Leverage</span>
              <span>Random 2–10x</span>
            </div>
            <div className="mt-2 border-t border-white/10 pt-2 text-white/60">
              Profit tax: 13% under 2.4% · 15% from 2.4–50% · 22% above 50%
            </div>
          </div>
        )}

        {box.flowKind === "mirror" && (
          <div className="mt-3 border border-white/15 p-3 text-[11px]">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Target basket weights
            </p>
            <p className="mt-1 text-white/70">
              {box.id === "silver"
                ? "wBTC 50% · ETH 20% · LINK 10% · ONDO 5% · MKR 5% · UNI 2% · AAVE 2% · AVAX 2% · ENA 2% · SEI 2%"
                : box.id === "gold"
                  ? "F 25% · SYRUP 25% · GFI 25% · CPOOL 25% (example configuration)"
                  : "UNB · LITH · STURDY · RLY · wTHT — 1% max slippage per coin, TWAP over 24h"}
            </p>
            {box.id === "diamond" && (
              <p className="mt-2 text-terminal-orange">
                You may receive several small bags. Highest-risk mirror.
              </p>
            )}
          </div>
        )}

        {box.flowKind === "portfolio-match" && (
          <div className="mt-3 border border-white/15 p-3 text-[11px] text-white/60">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Matchmaking
            </p>
            <p className="mt-1">
              You will be queued for a counterparty. Once matched, you get a
              30-second accept window. No takebacks after accepting.
            </p>
            <p className="mt-2 text-terminal-orange">
              Sepolia demo: no real counterparty pool is live.
            </p>
          </div>
        )}

        <QuotePanel
          total={total}
          box={box}
          toggles={toggles}
          tokens={rows.map((row) => row.token)}
        />

        {notice && (
          <p role="status" className="mt-2 text-[11px] text-terminal-orange">
            {notice}
          </p>
        )}
      </>
    );
  };

  const renderReview = (box: BoxDefinition) => {
    const random = box.flowKind === "random-swap" || box.flowKind === "random-box";
    const isWallet = box.assetMode === "wallet";
    const sendRows = isWallet
      ? SWEEP_ASSETS
      : rows
          .filter((row) => Number(row.amount) > 0)
          .map((row) => ({
            symbol: row.token,
            amount: row.amount,
            usd: formatUsd(usdValue(row.token, row.amount)),
          }));

    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            You send
          </p>
          <div className="mt-1 divide-y divide-white/10 border border-white/15">
            {sendRows.length === 0 ? (
              <p className="px-3 py-2 text-[11px] text-white/40">
                No assets selected.
              </p>
            ) : (
              sendRows.map((asset) => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between px-3 py-2 text-xs"
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

        {box.id === "white" && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Charity
            </p>
            <p className="mt-1 border border-white/15 px-3 py-2 text-xs text-white">
              {charityMode === "random"
                ? "Random charity selected by TheGivingBlock at execution"
                : charity}
            </p>
          </div>
        )}

        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            You receive
          </p>
          <div className="mt-1 border border-white/15 px-3 py-2 text-xs">
            {random ? (
              box.id === "rainbow" ? (
                <>
                  <p className="text-white">
                    ??? — the output of a randomly fired box. Its deposit rules apply.
                  </p>
                  <p className="mt-1 text-[10px] text-white/40">
                    Possible outcomes: any other box can fire — from a 1:1 token
                    swap (Red) to Black.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white">
                    ??? — one token from the active pool
                  </p>
                  <p className="mt-1 text-[10px] text-white/40">
                    Possible outputs: BAX · RIO · LINK · GFI · PEAR · wTHT · +12 more
                  </p>
                </>
              )
            ) : (
              box.demo.assets.map((asset) => (
                <div
                  key={`${asset.symbol}-${asset.amount}`}
                  className="flex items-center justify-between"
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

        <dl className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">ROUTE</dt>
            <dd className="text-right text-white/70">
              {box.id === "red" && toggles.route === "cross-chain"
                ? "Sepolia -> Axelar -> destination chain"
                : box.demo.route}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">NETWORK FEE</dt>
            <dd className="text-right text-white/70">
              0.0012 ETH + 5% premium
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">PLATFORM FEE</dt>
            <dd className="text-right text-white/70">5% of output</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/40">WALLET</dt>
            <dd className="text-right text-white/70">
              {walletName ?? "Demo wallet"} · Sepolia
            </dd>
          </div>
        </dl>

        <div className="border border-terminal-orange/50 bg-terminal-orange/5 p-3">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-terminal-orange">
            <ShieldAlert size={14} /> Risks
          </p>
          <ul className="mt-1 list-disc space-y-1 pl-4 text-[11px] text-white/70">
            {box.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>

        {box.id === "white" && (
          <div className="border border-white/40 p-3">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              Before you donate
            </p>
            <p className="mt-2 text-[14px] leading-relaxed text-white">
              {WHITE_BOX_RECEIPT_LANGUAGE.split("thegivingblock.com").map((part, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <a
                      href="https://thegivingblock.com"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline decoration-white/50 underline-offset-2 hover:text-terminal-green"
                    >
                      thegivingblock.com
                    </a>
                  )}
                  {part}
                </React.Fragment>
              ))}
            </p>
            <p className="mt-2 text-[11px] text-white/50">
              Donations made here are anonymous and do not generate a tax receipt.
            </p>
          </div>
        )}

        {box.requiresAcknowledgement && (
          <label className="flex items-start gap-3 border border-terminal-orange/60 bg-terminal-orange/5 p-3 text-[11px] text-white/80">
            <input
              type="checkbox"
              checked={ack}
              onChange={(event) => {
                setAck(event.target.checked);
                if (event.target.checked) setAckError(false);
              }}
              className="mt-0.5 h-4 w-4 accent-[#FD9C26]"
            />
            <span>
              {box.acknowledgement}
              {ackError && (
                <span className="mt-1 block text-terminal-orange">
                  Acknowledge the warning to continue.
                </span>
              )}
            </span>
          </label>
        )}

        {notice && (
          <p role="status" className="text-[11px] text-white/60">
            {notice}
          </p>
        )}

        <button
          type="button"
          onClick={() => setStep("error")}
          className="text-[10px] uppercase tracking-widest text-white/30 underline underline-offset-4 hover:text-white/60 focus:outline-none focus:ring-2 focus:ring-white"
        >
          Preview error state
        </button>
      </div>
    );
  };

  const renderSign = (box: BoxDefinition) => (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-terminal-green">
        Confirm in wallet
      </p>
      <h3 className="mt-2 text-xl font-bold text-white">
        {signing ? "Waiting for your wallet…" : `Open ${walletName ?? "your wallet"} to review`}
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-white/60">
        {formatUsd(total)} · {box.name} · Sepolia (11155111)
      </p>

      {signing ? (
        <div className="mt-6 border border-terminal-green/40 p-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 animate-pulse rounded-full bg-terminal-green" />
            <span className="text-xs text-white/80">
              Check {walletName} and approve the transaction request.
            </span>
          </div>
          <p className="mt-3 text-[11px] text-white/40">
            Nothing has been sent yet. Cancel returns you to review.
          </p>
          <button
            type="button"
            onClick={rejectSignature}
            className="mt-4 w-full border border-white/25 px-4 py-2 text-xs tracking-widest text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            CANCEL
          </button>
        </div>
      ) : (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {["MetaMask", "Phantom"].map((wallet) => (
            <button
              key={wallet}
              type="button"
              onClick={() => startSigning(wallet)}
              className="border border-white/25 px-4 py-3 text-left hover:border-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
            >
              <span className="block text-sm font-bold text-white">{wallet}</span>
              <span className="mt-1 block text-[10px] text-white/40">
                {wallet === "Phantom"
                  ? "EVM mode only. Solana flows are not live yet."
                  : "Recommended for EVM chains."}
              </span>
            </button>
          ))}
        </div>
      )}

      <p className="mt-4 text-[10px] leading-relaxed text-white/35">
        phreaking.fun will never ask for your seed phrase. Approve only the
        transaction shown in your wallet.
      </p>
    </div>
  );

  const renderFinality = (box: BoxDefinition) => (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-terminal-green">
        Transaction executing
      </p>
      <h3 className="mt-2 text-xl font-bold text-white">
        {STAGE_LABELS[stages[stageIndex]] ?? stages[stageIndex]}
      </h3>
      <p className="mt-1 text-[11px] text-white/40">
        {box.name} · elapsed {String(Math.floor(elapsed / 60)).padStart(2, "0")}:
        {String(elapsed % 60).padStart(2, "0")}
      </p>

      <ol
        className="mt-5 space-y-2"
        aria-live="polite"
        aria-label="Transaction stages"
      >
        {stages.map((stage, index) => {
          const done = index < stageIndex;
          const active = index === stageIndex;
          return (
            <li key={stage} className="flex items-center gap-3 text-xs">
              <span
                className={`flex h-5 w-5 items-center justify-center border ${
                  done
                    ? "border-terminal-green bg-terminal-green text-black"
                    : active
                      ? "border-terminal-green text-terminal-green"
                      : "border-white/20 text-white/20"
                }`}
              >
                {done ? <Check size={12} /> : active ? "›" : ""}
              </span>
              <span
                className={
                  done
                    ? "text-white/50"
                    : active
                      ? "text-white"
                      : "text-white/25"
                }
              >
                {STAGE_LABELS[stage] ?? stage}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 border-l-2 border-terminal-orange pl-3 text-[11px] text-white/60">
        Keep this tab open. You can hide this panel; the transaction will continue.
      </p>
    </div>
  );

  const renderStepBody = (box: BoxDefinition) => {
    switch (step) {
      case "configure":
        return renderConfigure(box);
      case "review":
        return renderReview(box);
      case "sign":
        return renderSign(box);
      case "finality":
        return renderFinality(box);
      case "result":
        return <ResultView box={box} />;
      case "error":
        return <ErrorView onRetry={resetToConfigure} />;
      default:
        return null;
    }
  };

  const footer = (box: BoxDefinition) => {
    if (step === "finality") {
      return (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setHiddenFinality(true)}
            className="border border-white/25 px-4 py-2 text-[11px] tracking-widest text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            HIDE PANEL
          </button>
          <span className="text-[10px] text-white/35">
            Execution continues in the background.
          </span>
        </div>
      );
    }

    if (step === "result") {
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              setStep("configure");
              setAck(false);
              setNftSelected([]);
              setNotice(null);
            }}
            className="flex-1 border border-terminal-green px-4 py-2 text-xs tracking-widest text-terminal-green hover:bg-terminal-green/10 focus:outline-none focus:ring-2 focus:ring-white"
          >
            OPEN ANOTHER {box.name}
          </button>
          <button
            type="button"
            onClick={closeFlow}
            className="flex-1 border border-white/25 px-4 py-2 text-xs tracking-widest text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            BACK TO TOOLKIT
          </button>
        </div>
      );
    }

    if (step === "error") {
      return null;
    }

    if (step === "sign") {
      return (
        <button
          type="button"
          onClick={() => setStep("review")}
          className="border border-white/25 px-4 py-2 text-xs tracking-widest text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
        >
          BACK TO REVIEW
        </button>
      );
    }

    if (step === "review") {
      return (
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={resetToConfigure}
            className="sm:w-36 border border-white/25 px-4 py-2 text-xs tracking-widest text-white hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
          >
            BACK
          </button>
          <button
            type="button"
            onClick={reviewPrimary}
            className="flex-1 border px-4 py-2 text-xs font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-white"
            style={{
              borderColor: accent,
              color: accent === "#FFFFFF" ? "#FFFFFF" : accent,
              backgroundColor: `${accent}14`,
            }}
          >
            CONFIRM IN WALLET
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={closeFlow}
          className="sm:w-36 border border-white/25 px-4 py-2 text-xs tracking-widest text-white/70 hover:border-white focus:outline-none focus:ring-2 focus:ring-white"
        >
          EXIT
        </button>
        <button
          type="button"
          onClick={goReview}
          disabled={!ready}
          className="flex-1 border px-4 py-2 text-xs font-bold tracking-widest disabled:cursor-not-allowed disabled:border-white/15 disabled:text-white/25 focus:outline-none focus:ring-2 focus:ring-white"
          style={
            ready
              ? {
                  borderColor: accent,
                  color: accent === "#FFFFFF" ? "#FFFFFF" : accent,
                  backgroundColor: `${accent}14`,
                }
              : undefined
          }
        >
          {ready ? primaryLabel : box.status === "locked" ? "UNLOCK REQUIRED" : "ENTER AN AMOUNT TO CONTINUE"}
        </button>
      </div>
    );
  };

  const selectedIcon = selected ? ICONS[selected.icon] ?? Gift : Gift;
  const SelectedIcon = selectedIcon;

  return (
    <div
      className="relative min-h-screen bg-terminal-black font-mono text-terminal-white"
      style={{ ["--accent" as string]: accent }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 transition-all duration-500"
        style={edgeStyle}
      />

      <header className="relative z-10 border-b border-white/15 px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-terminal-green">
              phreaking.fun / UX prototype
            </p>
            <h1 className="mt-1 text-lg font-bold tracking-widest text-white">
              BOX FLOW DESIGN v1
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border border-terminal-orange px-2 py-1 text-[9px] uppercase tracking-widest text-terminal-orange">
              Sepolia only · no transactions
            </span>
            <button
              type="button"
              onClick={() => setShowConnect(true)}
              className="border border-terminal-green px-3 py-1.5 text-[10px] uppercase tracking-widest text-terminal-green hover:bg-terminal-green/10 focus:outline-none focus:ring-2 focus:ring-white"
            >
              {connected ? `${walletName ?? "Demo wallet"} · connected` : "Connect wallet"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1400px] px-4 pb-28 pt-6 sm:px-8">
        <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/40">
              Design scope · 15 specified boxes · Yellow and Pink withheld
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Pick a box. Sign the mystery.
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/50">
              Every flow shares one state machine: configure, review, wallet signature,
              observed finality, result. Click any box to walk its screens. All data is
              simulated and no wallet is ever prompted.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] uppercase tracking-widest">
            {["Random", "Irreversible", "24h lock", "UNITE 10k", "Arcade"].map((chip) => (
              <span key={chip} className="border border-white/15 px-2 py-1 text-white/40">
                {chip}
              </span>
            ))}
          </div>
        </section>

        {TOOLKITS.map((toolkit) => (
          <section key={toolkit.id} className="mb-8">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-white/15 pb-1">
              <h3 className="text-xs font-bold tracking-[0.25em] text-white">
                {toolkit.label}
              </h3>
              <p className="max-w-3xl text-[10px] text-white/35">{toolkit.notice}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {BOXES_BY_TOOLKIT[toolkit.id].map((box) => {
                const Icon = ICONS[box.icon] ?? Gift;
                const locked = box.status === "locked";
                return (
                  <button
                    key={box.id}
                    type="button"
                    onClick={() => openBox(box)}
                    aria-label={`${box.name}: ${box.oneLine}`}
                    className="group relative flex flex-col border border-white/15 bg-black p-3 text-left transition-colors hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-white"
                    style={{ borderTopColor: box.accent }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold tracking-widest text-white">
                        {box.name}
                      </span>
                      <span className="text-[8px] uppercase tracking-widest text-white/40">
                        {box.mechanicLabel}
                      </span>
                    </div>
                    <div
                      className="relative mt-3 flex h-28 items-center justify-center overflow-hidden border border-white/10"
                      style={{
                        background: box.gradient
                          ? "linear-gradient(135deg, #FF3B30 0%, #FD9C26 20%, #16A34A 40%, #2F6BFF 60%, #A855F7 80%, #22E584 100%)"
                          : `radial-gradient(circle at 50% 40%, ${box.accent}33, #000 70%)`,
                      }}
                    >
                      <Icon
                        size={40}
                        className={locked ? "text-white/30 blur-[1px]" : "text-white/80"}
                      />
                      {locked && (
                        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                          <Lock size={18} className="text-white/80" />
                          <span className="text-[9px] uppercase tracking-widest text-white/80">
                            10,000 UNITE
                          </span>
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-[11px] leading-snug text-white/70">
                      {box.oneLine}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1 pt-3">
                      {(box.chips ?? []).map((chip) => (
                        <span
                          key={chip}
                          className="border border-white/20 px-1.5 py-0.5 text-[8px] uppercase tracking-widest text-white/50"
                        >
                          {chip}
                        </span>
                      ))}
                      <span className="ml-auto flex items-center gap-1 text-[8px] uppercase tracking-widest text-white/30 group-hover:text-white/70">
                        Open <ChevronRight size={10} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <section className="border border-white/15 p-4 text-[11px] leading-relaxed text-white/50">
          <p className="text-[10px] uppercase tracking-widest text-white/40">
            Not designed yet
          </p>
          <p className="mt-1">
            Yellow and Pink are withheld pending CEO confirmation of mechanics. The
            catalogue does not render them. See the design spec for the full copy
            deck, accessibility rules, and handoff checklist.
          </p>
        </section>
      </main>

      {hiddenFinality && selected && step === "finality" && (
        <button
          type="button"
          onClick={() => setHiddenFinality(false)}
          className="fixed bottom-4 left-1/2 z-40 flex w-[min(92vw,640px)] -translate-x-1/2 items-center justify-between gap-3 border px-4 py-3 text-left text-[11px] focus:outline-none focus:ring-2 focus:ring-white"
          style={{ borderColor: accent, backgroundColor: "#000" }}
        >
          <span className="text-white">
            {selected.name} executing — {STAGE_LABELS[stages[stageIndex]] ?? stages[stageIndex]}
          </span>
          <span className="text-terminal-green">SHOW</span>
        </button>
      )}

      {selected && !hiddenFinality && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && step !== "finality" && !signing) {
              closeFlow();
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="box-flow-title"
            tabIndex={-1}
            className="relative my-auto w-full max-w-[760px] border bg-black shadow-2xl focus:outline-none"
            style={{ borderColor: accent }}
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/15 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center border"
                  style={{ borderColor: accent, color: accent }}
                >
                  <SelectedIcon size={18} />
                </span>
                <div>
                  <h2 id="box-flow-title" className="text-sm font-bold tracking-widest text-white">
                    {selected.name}
                  </h2>
                  <p className="text-[9px] uppercase tracking-widest text-white/40">
                    {selected.mechanicLabel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StepRail step={step} box={selected} />
                <button
                  type="button"
                  aria-label="Close flow"
                  onClick={() => {
                    if (step === "finality") setHiddenFinality(true);
                    else if (!signing) closeFlow();
                  }}
                  className="p-1 text-white/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="max-h-[62vh] overflow-y-auto px-4 py-4 sm:px-5">
              {renderStepBody(selected)}
            </div>

            <div className="border-t border-white/15 px-4 py-3 sm:px-5">
              {footer(selected)}
            </div>
          </div>
        </div>
      )}

      {showConnect && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowConnect(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="connect-title"
            className="w-full max-w-md border border-terminal-green bg-black p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 id="connect-title" className="text-sm font-bold tracking-widest text-white">
                  CONNECT WALLET
                </h2>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-white/40">
                  Network: Sepolia (11155111) required
                </p>
              </div>
              <button
                type="button"
                aria-label="Close connect wallet"
                onClick={() => setShowConnect(false)}
                className="p-1 text-white/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 grid gap-2">
              {[
                { name: "MetaMask", note: "EVM wallets. Recommended." },
                {
                  name: "Phantom",
                  note: "EVM mode on Ethereum and supported EVM chains. Solana flows are not live yet.",
                },
              ].map((wallet) => (
                <button
                  key={wallet.name}
                  type="button"
                  onClick={() => {
                    setConnected(true);
                    setWalletName(wallet.name);
                    setShowConnect(false);
                  }}
                  className="border border-white/20 px-4 py-3 text-left hover:border-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <span className="block text-sm font-bold text-white">
                    {wallet.name}
                  </span>
                  <span className="mt-1 block text-[10px] text-white/40">
                    {wallet.note}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 text-[10px] leading-relaxed text-white/35">
              Prototype only: no wallet extension is prompted and no address is read.
              phreaking.fun will never ask for your seed phrase.
            </p>
          </div>
        </div>
      )}

      <footer className="relative z-10 border-t border-white/10 px-4 py-6 text-center text-[10px] uppercase tracking-widest text-white/25 sm:px-8">
        Simulated UX prototype · design spec in docs/design/box-ux-flows.md · Sepolia only
      </footer>

    </div>
  );
}
