import type { BoxId } from "@/components/design/boxFlows/types";

/**
 * Sepolia addresses for the OBS-129 fleet (MysteryBoxBase and its children).
 *
 * OBS-321 deployed the fleet, so the 15 catalogue boxes below are the live
 * broadcast-reconciled addresses. They live in the repo (not only in an env
 * var) so every production build resolves them without extra Netlify config.
 * Yellow and Pink are deployed but withheld from the catalogue, so they stay
 * out of this map and out of the UI. A box with no address here keeps the
 * static preview fallback from spec §10 item 10. Do not point these at the
 * older purchase contracts in src/lib/contracts.ts — those do not expose pause
 * or cap views.
 *
 * Override: NEXT_PUBLIC_BOX_ADDRESSES='{"mystery":"0x…"}' wins per box.
 */
export const DEPLOYED_BOX_ADDRESSES: Partial<Record<BoxId, `0x${string}`>> = {
  mystery: "0xcA4b2463ec6f175B3E8a1B25A966A0f7E514ee54",
  red: "0xABcB894E43e54A1F893105232b5a2E1484D04500",
  blue: "0xE387f0BD10929aDa06361361d5135ae7F8DFc09B",
  green: "0xc18aD7e2c3Bc2B671F002C0A92C5776443C09d81",
  white: "0x624e075f71e118A706c4CFB9B892936f5d6DA045",
  orange: "0x40eB969822830b4ba766513d0dFB88B8Ac7528EA",
  purple: "0x04591226eF43b651025d0819e936bC8e9FEA8F69",
  rainbow: "0x560E1Ee7123dd5D4f26097b6c95744F8D89d093E",
  black: "0x3050201d0Deed911C7B9376541D407B9b40a7fde",
  checkered: "0x27e3B90BCfa37aE14dC2B386F4E8e8E71889C400",
  silver: "0xed704582A7b572A192732BbDeFD60098684b23e4",
  gold: "0x84C81264A132e47a399689B73C9e80a9585A7dce",
  diamond: "0x19ffE942C67Cb8f4a15B4d462b61936d8aeac3D8",
  "russian-flag": "0x8C5c378e52A8774Ca972e6E0f5cAA2FD96711168",
  "coin-gatcha": "0xf36E322c7427b0791d9E148f2613dE12c45D22df",
};

const ENV_ADDRESSES: Partial<Record<BoxId, `0x${string}`>> = parseAddressEnv(
  process.env.NEXT_PUBLIC_BOX_ADDRESSES,
);

/** Deployed map, with the env override (if set) winning per box. */
export const SEPOLIA_BOX_ADDRESSES: Partial<Record<BoxId, `0x${string}`>> = {
  ...DEPLOYED_BOX_ADDRESSES,
  ...ENV_ADDRESSES,
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
