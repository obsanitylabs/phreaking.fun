/**
 * OBS-374 — pause / freeze governance model (pure, dependency-free).
 *
 * This module is the sole decision point for "may this admin act, and does the
 * action satisfy the Safe quorum?" It is deliberately self-contained: no React,
 * no wagmi, no viem, no imports. The dashboard, the route handler and the test
 * suite all call the same functions, so the UI cannot diverge from the rules.
 *
 * Design authority: OBS-414 (System Architect) — the 2-of-3 Gnosis Safe holds
 * `GUARDIAN_ROLE`; the Safe is the on-chain enforcement point; the dashboard is
 * a signature-collection / broadcast / read surface only. The single-admin
 * exception is a Safe *configuration* (`owners.length === 1`), derived at
 * runtime — never a dashboard toggle and never a bypass.
 *
 * Custody rule: no private key, seed or signing material lives in the
 * dashboard, in any service it adds, or in an agent context. Only signatures
 * are collected. This module never constructs a signer.
 */

export type GovernanceAction =
  | "PAUSE"
  | "FREEZE"
  | "QUEUE_UNPAUSE"
  | "RELEASE_UNPAUSE"
  | "OWNER_ADD"
  | "THRESHOLD_CHANGE";

export type QuorumState =
  | "UNSTAFFED"
  | "SINGLE_ADMIN_EXCEPTION"
  | "ENFORCED"
  | "MISCONFIGURED";

export type Outcome = "BROADCAST" | "REFUSED" | "REVERTED" | "CONFIRMED";

/** Board policy (OBS-414 §4): once two or more admins exist, unfreeze needs 2. */
export const DEFAULT_REQUIRED_QUORUM = 2;

/** Sepolia-only until G5 (OBS-414 §5). Mirrors the HomeClient mainnet gate. */
export const SEPOLIA_CHAIN_ID = 11155111;

export const GUARDIAN_ACTION_COPY = {
  unstaffed:
    "NOT STAFFED — no admins configured. Every pause and freeze is refused.",
  notOwner: "Connected wallet is not an admin (Safe owner). Read-only.",
  wrongChain:
    "Wrong network. Governance is Sepolia-only (chain 11155111). Refused.",
  unreadable:
    "Multisig state could not be read. Refusing every action; last verified state is stale.",
  misconfigured:
    "Safe misconfigured: 2 or more owners but the threshold is below policy (2). Unfreeze refused; raise the Safe threshold.",
  releaseTimelocked: "Unpause release is timelocked until",
  missingAdmin:
    "No admins configured means no quorum can ever be met. Refused.",
} as const;

export const ADMIN_SET_MESSAGES = {
  unstaffed: "NOT STAFFED — no admins configured",
} as const;

export interface AdminSetInput {
  owners: readonly string[];
  threshold: number;
  connectedAddress?: string | null;
  requiredQuorum?: number;
}

export interface AdminSetState {
  /** Normalised (lowercase, deduped, sorted) on-chain owner list. */
  owners: string[];
  adminCount: number;
  adminsConfigured: boolean;
  threshold: number;
  requiredQuorum: number;
  /** Signatures required of the on-chain signer set. 0 when unstaffed. */
  requiredSignatures: number;
  isOwner: boolean;
  exceptionActive: boolean;
  misconfigured: boolean;
  quorumState: QuorumState;
}

export interface DecisionInput {
  state: AdminSetState;
  action: GovernanceAction;
  signaturesCollected: number;
  /** false when the Safe / RPC read failed — fail closed. Defaults to true. */
  readOk?: boolean;
  chainId?: number;
  expectedChainId?: number;
  releaseUnpauseAt?: number;
  nowSeconds?: number;
}

export interface Decision {
  allowed: boolean;
  outcome: Outcome;
  quorumState: QuorumState;
  reason: string;
  signaturesNeeded: number;
  /** True while a permitted action is broadcast-but-not-yet-confirmed. */
  pending: boolean;
}

export function normalizeAddress(address: string): string {
  return address.trim().toLowerCase();
}

/**
 * Derive the admin set and quorum state from the on-chain Safe reads. The admin
 * set *is* `Safe.getOwners()` — it is not stored, guessed, or build-time.
 */
export function deriveAdminSet(input: AdminSetInput): AdminSetState {
  const owners = Array.from(
    new Set((input.owners ?? []).map(normalizeAddress).filter(isWalletAddress)),
  ).sort();
  const adminCount = owners.length;
  const threshold = Number.isFinite(input.threshold)
    ? Math.max(0, Math.trunc(input.threshold))
    : 0;
  const requiredQuorum =
    input.requiredQuorum === undefined
      ? DEFAULT_REQUIRED_QUORUM
      : Math.max(1, Math.trunc(input.requiredQuorum));
  const connected = input.connectedAddress
    ? normalizeAddress(input.connectedAddress)
    : null;

  const adminsConfigured = adminCount > 0;
  const isOwner = connected !== null && owners.includes(connected);
  const exceptionActive = adminCount === 1;
  const misconfigured = adminCount >= 2 && threshold < requiredQuorum;

  let quorumState: QuorumState;
  if (!adminsConfigured) quorumState = "UNSTAFFED";
  else if (misconfigured) quorumState = "MISCONFIGURED";
  else if (exceptionActive) quorumState = "SINGLE_ADMIN_EXCEPTION";
  else quorumState = "ENFORCED";

  return {
    owners,
    adminCount,
    adminsConfigured,
    threshold,
    requiredQuorum,
    requiredSignatures: adminsConfigured ? threshold : 0,
    isOwner,
    exceptionActive,
    misconfigured,
    quorumState,
  };
}

const FREEZE_ACTIONS: ReadonlySet<GovernanceAction> = new Set([
  "PAUSE",
  "FREEZE",
  "QUEUE_UNPAUSE",
]);

/**
 * Fail-closed decision for a single governance action. Returns `allowed: false`
 * with an explicit, user-facing reason in every unsafe case. There is no branch
 * that reaches the Safe with fewer than the on-chain threshold, and no
 * single-key fallback exists anywhere.
 */
export function decideGovernanceAction(input: DecisionInput): Decision {
  const { state, action } = input;
  const signaturesCollected = Math.max(0, Math.trunc(input.signaturesCollected || 0));
  const expectedChainId = input.expectedChainId ?? SEPOLIA_CHAIN_ID;

  const refuse = (reason: string, quorumState: QuorumState = state.quorumState): Decision => ({
    allowed: false,
    outcome: "REFUSED",
    quorumState,
    reason,
    signaturesNeeded: Math.max(0, state.requiredSignatures - signaturesCollected),
    pending: false,
  });

  if (input.readOk === false) {
    return refuse(GUARDIAN_ACTION_COPY.unreadable);
  }
  if (input.chainId !== undefined && input.chainId !== expectedChainId) {
    return refuse(GUARDIAN_ACTION_COPY.wrongChain);
  }
  if (!state.adminsConfigured) {
    return refuse(GUARDIAN_ACTION_COPY.unstaffed, "UNSTAFFED");
  }
  if (!state.isOwner) {
    return refuse(GUARDIAN_ACTION_COPY.notOwner);
  }
  if (state.misconfigured) {
    return refuse(GUARDIAN_ACTION_COPY.misconfigured, "MISCONFIGURED");
  }

  if (action === "RELEASE_UNPAUSE") {
    const releaseAt = Math.trunc(input.releaseUnpauseAt ?? 0);
    const now = Math.trunc(input.nowSeconds ?? Math.floor(Date.now() / 1000));
    if (releaseAt === 0) {
      return refuse("No unpause has been queued for this target. Refused.");
    }
    if (now < releaseAt) {
      return refuse(
        `${GUARDIAN_ACTION_COPY.releaseTimelocked} ${isoFromSeconds(releaseAt)}.`,
      );
    }
    return {
      allowed: true,
      outcome: "BROADCAST",
      quorumState: state.quorumState,
      reason: "Timelock elapsed — release is permissionless.",
      signaturesNeeded: 0,
      pending: true,
    };
  }

  if (FREEZE_ACTIONS.has(action)) {
    if (signaturesCollected < state.requiredSignatures) {
      const need = state.requiredSignatures - signaturesCollected;
      return refuse(
        `${signaturesCollected} of ${state.threshold} signatures collected — need ${need} more. Not broadcasting below the Safe threshold.`,
      );
    }
    const via =
      state.exceptionActive
        ? "single-admin exception (1-of-1 Safe)"
        : `${signaturesCollected}-of-${state.threshold} Safe signatures`;
    return {
      allowed: true,
      outcome: "BROADCAST",
      quorumState: state.quorumState,
      reason: `Quorum met via ${via}. Broadcasting one Safe transaction.`,
      signaturesNeeded: 0,
      pending: true,
    };
  }

  // OWNER_ADD / THRESHOLD_CHANGE are Safe transactions an owner signs directly;
  // there is no dashboard self-service for them.
  return refuse(
    `${action} is a Safe owner transaction, not a dashboard action. Refused.`,
  );
}

export function isoFromSeconds(seconds: number): string {
  return new Date(Math.trunc(seconds) * 1000)
    .toISOString()
    .replace(".000Z", "Z");
}

/**
 * Whether an owner may *collect* a signature on a Safe transaction. Distinct
 * from `decideGovernanceAction`: an owner signs while the quorum is still
 * forming, but nothing is broadcast until the threshold is reached. Collection
 * is refused when the wallet is not an owner or the state is unsafe.
 */
export function canCollectSignature(input: {
  state: AdminSetState;
  readOk?: boolean;
  chainId?: number;
  expectedChainId?: number;
}): { allowed: boolean; reason: string } {
  const { state } = input;
  const expectedChainId = input.expectedChainId ?? SEPOLIA_CHAIN_ID;
  if (input.readOk === false) return { allowed: false, reason: GUARDIAN_ACTION_COPY.unreadable };
  if (input.chainId !== undefined && input.chainId !== expectedChainId) {
    return { allowed: false, reason: GUARDIAN_ACTION_COPY.wrongChain };
  }
  if (!state.adminsConfigured) return { allowed: false, reason: GUARDIAN_ACTION_COPY.unstaffed };
  if (!state.isOwner) return { allowed: false, reason: GUARDIAN_ACTION_COPY.notOwner };
  if (state.misconfigured) {
    return { allowed: false, reason: GUARDIAN_ACTION_COPY.misconfigured };
  }
  return { allowed: true, reason: "Sign the Safe transaction to contribute to the quorum." };
}

// ---------------------------------------------------------------------------
// Runtime deployment config (pure parsing). Holds only values that do NOT
// change when an admin is injected: the Safe address, required quorum and the
// target contract list. The admin set itself is on-chain (`Safe.getOwners()`).
// Invalid or missing values degrade to "unset" — never to a guessed address.
// ---------------------------------------------------------------------------

export interface GovernanceTarget {
  address: string;
  name: string;
}

export interface RawGovernanceConfig {
  chainId?: number;
  safeAddress?: string;
  requiredQuorum?: number;
  targets?: ReadonlyArray<{ address?: string; name?: string }>;
}

export interface GovernanceConfig {
  chainId: number;
  safeAddress: string | null;
  requiredQuorum: number;
  targets: GovernanceTarget[];
}

function normalizeTargets(
  raw: ReadonlyArray<{ address?: string; name?: string }> | undefined,
): GovernanceTarget[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: GovernanceTarget[] = [];
  for (const entry of raw) {
    const address = typeof entry?.address === "string" ? entry.address.trim() : "";
    if (!isWalletAddress(address) || seen.has(address.toLowerCase())) continue;
    seen.add(address.toLowerCase());
    out.push({ address: address.toLowerCase(), name: entry?.name?.trim() || address });
  }
  return out;
}

export function parseGovernanceConfig(
  raw: RawGovernanceConfig | null | undefined,
  chainId: number = SEPOLIA_CHAIN_ID,
): GovernanceConfig {
  if (!raw || typeof raw !== "object") {
    return {
      chainId,
      safeAddress: null,
      requiredQuorum: DEFAULT_REQUIRED_QUORUM,
      targets: [],
    };
  }
  const safeAddress =
    typeof raw.safeAddress === "string" && isWalletAddress(raw.safeAddress)
      ? raw.safeAddress.toLowerCase()
      : null;
  const requiredQuorum =
    typeof raw.requiredQuorum === "number" && raw.requiredQuorum >= 1
      ? Math.trunc(raw.requiredQuorum)
      : DEFAULT_REQUIRED_QUORUM;
  return {
    chainId: typeof raw.chainId === "number" ? raw.chainId : chainId,
    safeAddress,
    requiredQuorum,
    targets: normalizeTargets(raw.targets),
  };
}

// ---------------------------------------------------------------------------
// Audit log (OBS-414 §6) — a dedicated access-controlled store, never the
// analytics/event pipeline.
// ---------------------------------------------------------------------------

export interface AuditTarget {
  address: string;
  name: string;
}

export interface GovernanceAuditRecordInput {
  requestId: string;
  timestamp?: string;
  chainId: number;
  actorWallet: string;
  actorIsOwner: boolean;
  action: GovernanceAction;
  targets: readonly AuditTarget[];
  safeAddress: string;
  safeTxHash: string;
  safeNonce: number;
  quorumThreshold: number;
  quorumOwnerCount: number;
  quorumSignatures: number;
  quorumState: QuorumState;
  outcome: Outcome;
  txHash?: string | null;
  blockNumber?: number | null;
  reason?: string | null;
}

export interface GovernanceAuditRecord {
  id: string;
  timestamp: string;
  chainId: number;
  actorWallet: string;
  actorIsOwner: boolean;
  action: GovernanceAction;
  targets: AuditTarget[];
  safeAddress: string;
  safeTxHash: string;
  safeNonce: number;
  quorumThreshold: number;
  quorumOwnerCount: number;
  quorumSignatures: number;
  quorumState: QuorumState;
  outcome: Outcome;
  txHash: string | null;
  blockNumber: number | null;
  reason: string | null;
}

export function buildAuditRecord(
  input: GovernanceAuditRecordInput,
): GovernanceAuditRecord {
  return {
    id: input.requestId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    chainId: input.chainId,
    actorWallet: normalizeAddress(input.actorWallet),
    actorIsOwner: Boolean(input.actorIsOwner),
    action: input.action,
    targets: input.targets.map((t) => ({
      address: normalizeAddress(t.address),
      name: t.name,
    })),
    safeAddress: normalizeAddress(input.safeAddress),
    safeTxHash: input.safeTxHash,
    safeNonce: Math.trunc(input.safeNonce),
    quorumThreshold: Math.trunc(input.quorumThreshold),
    quorumOwnerCount: Math.trunc(input.quorumOwnerCount),
    quorumSignatures: Math.trunc(input.quorumSignatures),
    quorumState: input.quorumState,
    outcome: input.outcome,
    txHash: input.txHash ?? null,
    blockNumber: input.blockNumber ?? null,
    reason: input.reason ?? null,
  };
}

// ---------------------------------------------------------------------------
// Analytics guard (OBS-126 constraint): no wallet address may reach the
// analytics/event store. The audit record holds wallet addresses; analytics
// payloads must not.
// ---------------------------------------------------------------------------

export const WALLET_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export function isWalletAddress(value: unknown): value is string {
  return typeof value === "string" && WALLET_ADDRESS_PATTERN.test(value.trim());
}

const WALLET_KEYS = new Set([
  "actorWallet",
  "adminWallet",
  "safeAddress",
  "walletAddress",
  "wallet",
]);

/**
 * Return the JSON paths where an analytics payload leaks a wallet address —
 * either a wallet-typed key or a raw `0x…40` literal. Empty array means clean.
 */
export function findWalletLeaks(value: unknown, path = "$"): string[] {
  const leaks = new Set<string>();
  const walk = (node: unknown, at: string) => {
    if (typeof node === "string") {
      if (isWalletAddress(node)) leaks.add(at);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${at}[${index}]`));
      return;
    }
    if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) {
        if (WALLET_KEYS.has(key)) leaks.add(`${at}.${key}`);
        walk(child, `${at}.${key}`);
      }
    }
  };
  walk(value, path);
  return [...leaks];
}

/** Throws when a payload would write a wallet address into analytics storage. */
export function assertNoWalletAddressesInAnalytics(payload: unknown): void {
  const leaks = findWalletLeaks(payload);
  if (leaks.length > 0) {
    throw new Error(
      `Refusing to write a wallet address to the analytics store: ${leaks.join(", ")}`,
    );
  }
}
