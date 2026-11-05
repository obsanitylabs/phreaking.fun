"use client";

/**
 * OBS-374 — pause / freeze governance control surface.
 *
 * Renders inside the existing admin dashboard (OBS-126). It governs pause,
 * freeze, unpause and unfreeze by collecting guardian-Safe signatures and
 * broadcasting one Safe transaction — it never holds a key. The admin set is
 * read on-chain (`Safe.getOwners()`); the single-admin exception is derived
 * (`owners.length === 1`) and shown explicitly. Every action attempts an
 * access-controlled audit write and fails closed if quorum or the audit store
 * is unavailable.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Address } from "viem";
import { useAccount, useSignTypedData, useWriteContract } from "wagmi";
import {
  buildAuditRecord,
  canCollectSignature,
  decideGovernanceAction,
  GUARDIAN_ACTION_COPY,
  type AdminSetState,
  type Decision,
  type GovernanceAction,
  type Outcome,
  type QuorumState,
} from "@/lib/governance/model";
import {
  buildSafeTx,
  encodeExecTransaction,
  SAFE_TX_TYPES,
  safeTxDomain,
  sortSignatures,
  type CollectedSignature,
} from "@/lib/governance/safeTx";

interface ApiTarget {
  address: string;
  name: string;
  hasGuardianRole: boolean;
  paused: boolean;
  unpauseReleaseAt: number;
}

interface ApiSnapshot {
  readOk: boolean;
  safeConfigured: boolean;
  chainId: number;
  safeAddress: string | null;
  safeNonce: number;
  adminSet: AdminSetState;
  targets: ApiTarget[];
  note: string;
  configSource: string;
  requiredQuorum: number;
}

interface Attempt {
  action: GovernanceAction;
  targets: ApiTarget[];
  decision: Decision;
  signatures: CollectedSignature[];
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function quorumBadge(state: AdminSetState): { label: string; className: string } {
  switch (state.quorumState) {
    case "UNSTAFFED":
      return { label: "NOT STAFFED — no admins configured", className: "text-red-400" };
    case "MISCONFIGURED":
      return { label: "MISCONFIGURED — threshold below policy", className: "text-red-400" };
    case "SINGLE_ADMIN_EXCEPTION":
      return {
        label: "SINGLE-ADMIN EXCEPTION ON — 1-of-1 Safe",
        className: "text-amber-300",
      };
    default:
      return {
        label: `ENFORCED — ${state.threshold}-of-${state.adminCount} Safe`,
        className: "text-terminal-green",
      };
  }
}

export default function GovernancePanel() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const { writeContractAsync } = useWriteContract();

  const [snapshot, setSnapshot] = useState<ApiSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<CollectedSignature[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const query = address ? `?address=${address}` : "";
      const response = await fetch(`/api/governance/state${query}`, { cache: "no-store" });
      const data = (await response.json()) as ApiSnapshot;
      setSnapshot(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "governance read failed");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // A nonce change invalidates collected signatures (single-use Safe tx).
  useEffect(() => {
    setSignatures([]);
  }, [snapshot?.safeNonce]);

  const state: AdminSetState | null = snapshot?.adminSet ?? null;

  async function writeAudit(record: Attempt, outcome: Outcome, txHash: string | null, reason: string | null) {
    try {
      const audit = buildAuditRecord({
        requestId: `${record.action}:${record.targets.map((t) => t.address).join(",")}:${Date.now()}`,
        chainId: snapshot?.chainId ?? 11155111,
        actorWallet: address ?? "0x0000000000000000000000000000000000000000",
        actorIsOwner: state?.isOwner ?? false,
        action: record.action,
        targets: record.targets.map((t) => ({ address: t.address, name: t.name })),
        safeAddress: snapshot?.safeAddress ?? "0x0000000000000000000000000000000000000000",
        safeTxHash: "",
        safeNonce: snapshot?.safeNonce ?? 0,
        quorumThreshold: state?.threshold ?? 0,
        quorumOwnerCount: state?.adminCount ?? 0,
        quorumSignatures: record.signatures.length,
        quorumState: (record.decision.quorumState ?? "ENFORCED") as QuorumState,
        outcome,
        txHash,
        reason,
      });
      const response = await fetch("/api/governance/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record: audit }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function runAction(action: GovernanceAction, targets: ApiTarget[]) {
    setMessage(null);
    if (!snapshot || !state || !address || targets.length === 0) return;

    const decision = decideGovernanceAction({
      state,
      action,
      signaturesCollected: signatures.length,
      readOk: snapshot.readOk,
      chainId: snapshot.chainId,
      releaseUnpauseAt: targets[0].unpauseReleaseAt,
    });
    const attempt: Attempt = { action, targets, decision, signatures };

    if (!decision.allowed) {
      const audited = await writeAudit(attempt, "REFUSED", null, decision.reason);
      setMessage(
        audited
          ? decision.reason
          : `${decision.reason} (audit store unavailable — refused and not broadcast.)`,
      );
      return;
    }

    if (!snapshot.safeAddress) {
      setMessage("No guardian Safe configured. Refused.");
      return;
    }
    const safe = snapshot.safeAddress as Address;
    const targetAddresses = targets.map((t) => t.address);
    const tx = buildSafeTx(action, targetAddresses, BigInt(snapshot.safeNonce));

    try {
      if (action === "RELEASE_UNPAUSE") {
        const hash = await writeContractAsync({
          address: targetAddresses[0] as Address,
          abi: [
            { type: "function", name: "releaseUnpause", stateMutability: "nonpayable", inputs: [], outputs: [] },
          ] as const,
          functionName: "releaseUnpause",
        });
        await writeAudit(attempt, "BROADCAST", hash, "releaseUnpause (permissionless)");
        setMessage(`Release broadcast: ${hash}`);
        return;
      }

      const signature = await signTypedDataAsync({
        domain: safeTxDomain(snapshot.chainId, safe),
        types: SAFE_TX_TYPES,
        primaryType: "SafeTx",
        message: tx,
      });
      const next = sortSignatures([
        ...signatures.filter((s) => s.owner.toLowerCase() !== address.toLowerCase()),
        { owner: address as Address, signature },
      ]);
      setSignatures(next);

      const threshold = state.requiredSignatures;
      if (next.length < threshold) {
        setMessage(
          `${next.length} of ${threshold} signatures collected — need ${threshold - next.length} more. Not broadcasting below the Safe threshold.`,
        );
        return;
      }

      const encoded = encodeExecTransaction(safe, tx, next);
      const hash = await writeContractAsync(encoded);
      const audited = await writeAudit(
        { ...attempt, signatures: next },
        "BROADCAST",
        hash,
        decision.reason,
      );
      setMessage(
        audited
          ? `Broadcast ${action} — pending until the receipt and event confirm: ${hash}`
          : `Broadcast ${action} (${hash}) but the audit write failed. Treat as pending and reconcile.`,
      );
      setSignatures([]);
      setTimeout(() => void refresh(), 4000);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "action failed");
    }
  }

  const collect = useMemo(() => {
    if (!state) return null;
    return canCollectSignature({ state, readOk: snapshot?.readOk, chainId: snapshot?.chainId });
  }, [state, snapshot]);

  const badge = state ? quorumBadge(state) : null;

  return (
    <div className="relative w-full bg-terminal-black border border-terminal-green font-mono text-sm text-terminal-white px-6 py-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-terminal-green">Pause / Freeze governance</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="text-terminal-green-dark hover:text-terminal-green text-xs"
        >
          {loading ? "READING…" : "REFRESH"}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs mb-2">Read error: {error}</p>}

      {snapshot && (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3 border-b border-terminal-green/30 pb-3">
            <span className="text-terminal-green-dark">CHAIN</span>
            <span>{snapshot.chainId} (Sepolia only)</span>
            <span className="text-terminal-green-dark">SAFE</span>
            <span>{snapshot.safeAddress ? shortAddress(snapshot.safeAddress) : "—"}</span>
            <span className="text-terminal-green-dark">ADMINS</span>
            <span>
              {state?.adminCount ?? 0} owner(s) · threshold {state?.threshold ?? 0} · policy{" "}
              {snapshot.requiredQuorum}
            </span>
            <span className="text-terminal-green-dark">CONFIG SOURCE</span>
            <span>{snapshot.configSource}</span>
            <span className="text-terminal-green-dark">CONNECTED</span>
            <span>{address ? shortAddress(address) : "not connected"}</span>
          </div>

          {badge && (
            <p className={`text-xs mb-2 ${badge.className}`} data-testid="quorum-badge">
              {badge.label}
            </p>
          )}

          {state && !state.adminsConfigured && (
            <p className="text-xs text-red-400 mb-3" data-testid="no-admins">
              {GUARDIAN_ACTION_COPY.unstaffed}
            </p>
          )}
          {state && !state.isOwner && state.adminsConfigured && (
            <p className="text-xs text-amber-300 mb-3">Read-only: connected wallet is not a Safe owner.</p>
          )}
          {collect && !collect.allowed && state?.adminsConfigured && state.isOwner && (
            <p className="text-xs text-amber-300 mb-3">{collect.reason}</p>
          )}

          {snapshot.targets.length > 0 && (
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                className="border border-terminal-green px-2 py-0.5 text-xs hover:bg-terminal-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!state?.isOwner || loading}
                onClick={() => void runAction("PAUSE", snapshot.targets)}
              >
                PAUSE / FREEZE ALL ({snapshot.targets.length})
              </button>
              <button
                type="button"
                className="border border-terminal-green px-2 py-0.5 text-xs hover:bg-terminal-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!state?.isOwner || loading}
                onClick={() => void runAction("QUEUE_UNPAUSE", snapshot.targets)}
              >
                QUEUE UNPAUSE ALL
              </button>
            </div>
          )}

          <div className="flex flex-col gap-2 mb-3">
            {snapshot.targets.length === 0 && (
              <p className="text-xs text-terminal-green-dark">
                No target contracts configured. Inject the fleet address list into the runtime store
                (no rebuild). Governance is not staffed until then.
              </p>
            )}
            {snapshot.targets.map((target) => (
              <div
                key={target.address}
                className="border border-terminal-green/30 px-3 py-2 text-xs"
                data-testid="target-row"
              >
                <div className="flex items-center justify-between">
                  <span className="text-terminal-green">{target.name}</span>
                  <span className={target.paused ? "text-amber-300" : "text-terminal-green"}>
                    {target.paused ? "PAUSED" : "LIVE"}
                  </span>
                </div>
                <div className="text-terminal-green-dark">
                  {shortAddress(target.address)} · guardian{" "}
                  {target.hasGuardianRole ? "✓" : "✗"} · release{" "}
                  {target.unpauseReleaseAt > 0
                    ? new Date(target.unpauseReleaseAt * 1000).toISOString()
                    : "—"}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="border border-terminal-green px-2 py-0.5 hover:bg-terminal-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!state?.isOwner || loading}
                    onClick={() => void runAction("PAUSE", [target])}
                  >
                    PAUSE / FREEZE
                  </button>
                  <button
                    type="button"
                    className="border border-terminal-green px-2 py-0.5 hover:bg-terminal-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!state?.isOwner || loading}
                    onClick={() => void runAction("QUEUE_UNPAUSE", [target])}
                  >
                    QUEUE UNPAUSE
                  </button>
                  <button
                    type="button"
                    className="border border-terminal-green px-2 py-0.5 hover:bg-terminal-green/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={!state?.isOwner || loading}
                    onClick={() => void runAction("RELEASE_UNPAUSE", [target])}
                  >
                    RELEASE UNPAUSE
                  </button>
                </div>
              </div>
            ))}
          </div>

          {signatures.length > 0 && (
            <p className="text-xs text-terminal-green mb-2">
              {signatures.length} signature(s) collected:{" "}
              {signatures.map((s) => shortAddress(s.owner)).join(", ")}
            </p>
          )}
          {message && (
            <p className="text-xs text-terminal-white mb-2" data-testid="action-message">
              {message}
            </p>
          )}
          <p className="text-[10px] text-terminal-green-dark mt-auto">
            No private key in this dashboard. Signatures are collected from the connected guardian
            wallet and executed through the 2-of-3 Safe. Fail-closed below quorum.
          </p>
        </>
      )}
    </div>
  );
}
