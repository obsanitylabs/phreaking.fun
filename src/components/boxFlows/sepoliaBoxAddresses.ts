import type { BoxId } from "@/components/design/boxFlows/types";

/**
 * Sepolia addresses for the OBS-129 fleet (MysteryBoxBase and its children).
 *
 * The rebuild is not broadcast yet. Leave an entry empty until Deploy.s.sol
 * records a contract address. The UI then uses the static preview fallback
 * from spec §10 item 10. Do not point these at the older purchase contracts
 * in src/lib/contracts.ts — those do not expose pause or cap views.
 *
 * Optional override: NEXT_PUBLIC_BOX_ADDRESSES='{"mystery":"0x…"}'
 */
const ENV_ADDRESSES: Partial<Record<BoxId, string>> = parseAddressEnv(
  process.env.NEXT_PUBLIC_BOX_ADDRESSES,
);

export const SEPOLIA_BOX_ADDRESSES: Partial<Record<BoxId, `0x${string}`>> = {
  ...(ENV_ADDRESSES as Partial<Record<BoxId, `0x${string}`>>),
};

function parseAddressEnv(raw: string | undefined): Partial<Record<BoxId, `0x${string}`>> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Partial<Record<BoxId, `0x${string}`>> = {};
    for (const [id, address] of Object.entries(parsed)) {
      if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        out[id as BoxId] = address as `0x${string}`;
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function sepoliaBoxAddress(boxId: BoxId): `0x${string}` | null {
  return SEPOLIA_BOX_ADDRESSES[boxId] ?? null;
}

/**
 * Dev-only override so a browser walk can point one box at a Sepolia address
 * without a rebuild. Production builds ignore the query string.
 */
export function resolveBoxAddress(boxId: BoxId, search = ""): `0x${string}` | null {
  if (process.env.NODE_ENV !== "production") {
    const params = new URLSearchParams(search);
    const override = params.get("boxAddress");
    if (override && /^0x[a-fA-F0-9]{40}$/.test(override)) return override as `0x${string}`;
  }
  return sepoliaBoxAddress(boxId);
}
