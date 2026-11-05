/**
 * OBS-374 — Gnosis Safe transaction construction (browser-side, no keys).
 *
 * Builds the batched `MultiSendCallOnly` call for pause / queueUnpause, the
 * EIP-712 `SafeTx` typed-data for `eth_signTypedData_v4`, sorts collected
 * signatures by owner address (Safe requires this), and encodes
 * `execTransaction`. The connected admin signs; this module never touches a
 * private key, seed or signing material.
 */

import {
  concatHex,
  encodeFunctionData,
  hashTypedData,
  type Address,
  type Hex,
} from "viem";
import { GUARDIAN_ROLE } from "./safeRead";
import type { GovernanceAction } from "./model";

/** Canonical MultiSendCallOnly (same address on every chain). */
export const MULTI_SEND_CALL_ONLY: Address =
  "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D";

export const SAFE_EXEC_ABI = [
  {
    type: "function",
    name: "execTransaction",
    stateMutability: "payable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "signatures", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const MULTI_SEND_ABI = [
  {
    type: "function",
    name: "multiSend",
    stateMutability: "payable",
    inputs: [{ name: "transactions", type: "bytes" }],
    outputs: [],
  },
] as const;

const PAUSE_CALL_ABI = [
  { type: "function", name: "pause", stateMutability: "nonpayable", inputs: [], outputs: [] },
] as const;

const QUEUE_UNPAUSE_CALL_ABI = [
  {
    type: "function",
    name: "queueUnpause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export const RELEASE_UNPAUSE_CALL_ABI = [
  {
    type: "function",
    name: "releaseUnpause",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;

export interface SafeTxCall {
  to: Address;
  value: bigint;
  data: Hex;
  /** 0 = CALL, 1 = DELEGATECALL. */
  operation: 0 | 1;
}

export interface SafeTx {
  to: Address;
  value: bigint;
  data: Hex;
  operation: 0 | 1;
  safeTxGas: bigint;
  baseGas: bigint;
  gasPrice: bigint;
  gasToken: Address;
  refundReceiver: Address;
  nonce: bigint;
}

const ZERO_ADDRESS: Address = "0x0000000000000000000000000000000000000000";

/** Encode one MultiSend entry: operation ‖ to ‖ value ‖ dataLength ‖ data. */
export function encodeMultiSendEntry(call: SafeTxCall): Hex {
  const operation = call.operation.toString(16).padStart(2, "0");
  const to = call.to.toLowerCase().slice(2);
  const value = call.value.toString(16).padStart(64, "0");
  const data = call.data.slice(2);
  const dataLength = BigInt(data.length / 2)
    .toString(16)
    .padStart(64, "0");
  return `0x${operation}${to}${value}${dataLength}${data}`;
}

export function encodeMultiSend(calls: readonly SafeTxCall[]): Hex {
  return concatHex(calls.map(encodeMultiSendEntry));
}

/** Build the call list for an action across its target contracts. */
export function buildCalls(
  action: GovernanceAction,
  targets: readonly string[],
): SafeTxCall[] {
  const abi =
    action === "QUEUE_UNPAUSE"
      ? QUEUE_UNPAUSE_CALL_ABI
      : action === "RELEASE_UNPAUSE"
        ? RELEASE_UNPAUSE_CALL_ABI
        : PAUSE_CALL_ABI;
  const fn =
    action === "QUEUE_UNPAUSE"
      ? "queueUnpause"
      : action === "RELEASE_UNPAUSE"
        ? "releaseUnpause"
        : "pause";
  return targets.map((to) => ({
    to: to as Address,
    value: BigInt(0),
    data: encodeFunctionData({ abi, functionName: fn }),
    operation: 0,
  }));
}

/**
 * Build the SafeTx. Pause / queueUnpause are batched through MultiSendCallOnly
 * (operation 1 = DelegateCall to the MultiSend library). `releaseUnpause` is
 * permissionless and executed as a direct call, not via the Safe.
 */
export function buildSafeTx(
  action: GovernanceAction,
  targets: readonly string[],
  nonce: bigint,
): SafeTx {
  const calls = buildCalls(action, targets);
  if (action === "RELEASE_UNPAUSE") {
    const first = calls[0];
    return {
      to: first.to,
      value: first.value,
      data: first.data,
      operation: 0,
      safeTxGas: BigInt(0),
      baseGas: BigInt(0),
      gasPrice: BigInt(0),
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      nonce,
    };
  }
  return {
    to: MULTI_SEND_CALL_ONLY,
    value: BigInt(0),
    data: encodeFunctionData({
      abi: MULTI_SEND_ABI,
      functionName: "multiSend",
      args: [encodeMultiSend(calls)],
    }),
    operation: 1,
    safeTxGas: BigInt(0),
    baseGas: BigInt(0),
    gasPrice: BigInt(0),
    gasToken: ZERO_ADDRESS,
    refundReceiver: ZERO_ADDRESS,
    nonce,
  };
}

export function safeTxDomain(chainId: number, safeAddress: Address) {
  return { chainId, verifyingContract: safeAddress } as const;
}

export const SAFE_TX_TYPES = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
} as const;

/** EIP-712 hash the owners sign (`eth_signTypedData_v4`). */
export function safeTxHash(chainId: number, safeAddress: Address, tx: SafeTx): Hex {
  return hashTypedData({
    domain: safeTxDomain(chainId, safeAddress),
    types: SAFE_TX_TYPES,
    primaryType: "SafeTx",
    message: tx,
  });
}

export interface CollectedSignature {
  owner: Address;
  signature: Hex;
}

/** Sort signatures by owner address ascending — required by the Safe. */
export function sortSignatures(
  signatures: readonly CollectedSignature[],
): CollectedSignature[] {
  return [...signatures].sort((a, b) =>
    a.owner.toLowerCase() < b.owner.toLowerCase() ? -1 : 1,
  );
}

export function encodeExecTransaction(safe: Address, tx: SafeTx, signatures: readonly CollectedSignature[]) {
  const sorted = sortSignatures(signatures);
  return {
    abi: SAFE_EXEC_ABI,
    address: safe,
    functionName: "execTransaction" as const,
    args: [
      tx.to,
      tx.value,
      tx.data,
      tx.operation,
      tx.safeTxGas,
      tx.baseGas,
      tx.gasPrice,
      tx.gasToken,
      tx.refundReceiver,
      concatHex(sorted.map((s) => s.signature)),
    ] as const,
  };
}

export { GUARDIAN_ROLE };
