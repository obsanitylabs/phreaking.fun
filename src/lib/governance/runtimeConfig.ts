/**
 * OBS-374 — runtime governance configuration IO.
 *
 * Resolves deployment-shaped config (Safe address, required quorum, targets)
 * from a runtime source at request time. The authoritative *admin set* is
 * on-chain (`Safe.getOwners()`) and is never configured here.
 *
 * No build-time config. Read from a Next.js route handler at request time:
 * Netlify Blobs first (the canonical injection path), then server environment
 * variables. Never `NEXT_PUBLIC_*`, which Next.js inlines into the client
 * bundle at build time.
 */

import fs from "node:fs";
import {
  parseGovernanceConfig,
  SEPOLIA_CHAIN_ID,
  type GovernanceConfig,
  type RawGovernanceConfig,
} from "./model";

export type { GovernanceConfig, GovernanceTarget, RawGovernanceConfig } from "./model";

export interface GovernanceRuntimeConfig extends GovernanceConfig {
  /** Where the config was resolved from, for the "stale/unset" UI label. */
  source: "store" | "env" | "unset";
}

export const GOVERNANCE_STORE_NAME = "governance";
export const GOVERNANCE_STORE_KEY = "config";
export const GOVERNANCE_CONFIG_LOCAL_PATH =
  process.env.GOVERNANCE_CONFIG_LOCAL_PATH || ".obs-governance-config.json";

/** A reader resolves the raw config document from some runtime source. */
export type ConfigReader = () => Promise<RawGovernanceConfig | null>;

/**
 * Read the raw config from Netlify Blobs (the canonical runtime store) when a
 * Blobs context is present. The module specifier is non-literal so the bundler
 * does not try to inline it; any failure degrades to `null`.
 */
async function readFromRuntimeStore(): Promise<RawGovernanceConfig | null> {
  const context = process.env.NETLIFY_BLOBS_CONTEXT;
  if (context) {
    try {
      const specifier = "@netlify/blobs";
      const mod = (await import(/* webpackIgnore: true */ specifier)) as unknown as {
        getStore: (opts: { name: string; context?: string }) => {
          get: (key: string) => Promise<string | null>;
        };
      };
      const store = mod.getStore({ name: GOVERNANCE_STORE_NAME, context });
      const text = await store.get(GOVERNANCE_STORE_KEY);
      if (text) return JSON.parse(text) as RawGovernanceConfig;
    } catch {
      // fall through to the local shim
    }
  }
  // Local/dev shim: a JSON file write is still a runtime *data* write, not a
  // rebuild. Mirrors the waitlist store's local fallback.
  try {
    if (fs.existsSync(GOVERNANCE_CONFIG_LOCAL_PATH)) {
      return JSON.parse(
        fs.readFileSync(GOVERNANCE_CONFIG_LOCAL_PATH, "utf8"),
      ) as RawGovernanceConfig;
    }
  } catch {
    return null;
  }
  return null;
}

function readFromEnv(): RawGovernanceConfig | null {
  const safeAddress = process.env.GOVERNANCE_SAFE_ADDRESS;
  const targetsRaw = process.env.GOVERNANCE_TARGETS;
  const quorumRaw = process.env.GOVERNANCE_REQUIRED_QUORUM;
  if (!safeAddress && !targetsRaw && !quorumRaw) return null;
  let targets: RawGovernanceConfig["targets"];
  if (targetsRaw) {
    try {
      targets = JSON.parse(targetsRaw);
    } catch {
      targets = undefined;
    }
  }
  return {
    safeAddress,
    requiredQuorum: quorumRaw ? Number(quorumRaw) : undefined,
    targets,
  };
}

/**
 * Resolve the runtime config. Injecting deployment config is a store write;
 * changing the admin set is an on-chain Safe transaction and never touches this.
 */
export async function loadGovernanceConfig(
  reader?: ConfigReader,
  chainId: number = SEPOLIA_CHAIN_ID,
): Promise<GovernanceRuntimeConfig> {
  if (reader) {
    return { ...parseGovernanceConfig(await reader(), chainId), source: "store" };
  }
  const fromStore = await readFromRuntimeStore();
  if (fromStore) {
    return { ...parseGovernanceConfig(fromStore, chainId), source: "store" };
  }
  const fromEnv = readFromEnv();
  if (fromEnv) {
    return { ...parseGovernanceConfig(fromEnv, chainId), source: "env" };
  }
  return { ...parseGovernanceConfig(null, chainId), source: "unset" };
}
