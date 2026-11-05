// OBS-374 — mechanical checks for the pause/freeze governance surface.
// Mirrors the PM's verification list. Fails the process on any regression.
//
//   node scripts/verify-governance.mjs
//
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const GOVERNANCE_DIR = "src/lib/governance";
const files = readdirSync(join(root, GOVERNANCE_DIR)).filter((f) =>
  f.endsWith(".ts"),
);

// 1. No build-time admin config anywhere in src/.
for (const file of files) {
  const text = read(join(GOVERNANCE_DIR, file));
  assert.equal(
    /NEXT_PUBLIC_[A-Z_]*ADMIN/.test(text),
    false,
    `${file} must not read a NEXT_PUBLIC admin list (build-time)`,
  );
}

// 2. The admin set is the on-chain Safe owner list.
const safeRead = read(`${GOVERNANCE_DIR}/safeRead.ts`);
assert.ok(safeRead.includes("getOwners"), "admin set must be read from Safe.getOwners()");
assert.ok(safeRead.includes("getThreshold"), "quorum threshold must be read from Safe.getThreshold()");
assert.ok(safeRead.includes("hasRole"), "targets must be checked for GUARDIAN_ROLE");
assert.equal(
  /writeContract|signTypedData|privateKey|mnemonic|seedPhrase/.test(safeRead),
  false,
  "safeRead must be read-only (no signing or writes)",
);

// 3. No hard-coded admin/guardian wallet address in the governance source.
// The only allowed 0x…40 literals are canonical contract constants.
const ALLOWED_LITERALS = new Set([
  "0x40a2accbd92bca938b02010e17a5b8929b49130d", // MultiSendCallOnly
  "0x0000000000000000000000000000000000000000", // zero address
]);
for (const file of files) {
  const text = read(join(GOVERNANCE_DIR, file));
  for (const match of text.matchAll(/0x[0-9a-fA-F]{40}/g)) {
    assert.ok(
      ALLOWED_LITERALS.has(match[0].toLowerCase()),
      `${file} contains a hard-coded address literal ${match[0]} — admin/guardian addresses must stay out of source`,
    );
  }
}

// 4. The model is a self-contained leaf, so the rules cannot silently diverge.
const model = read(`${GOVERNANCE_DIR}/model.ts`);
assert.equal(/^\s*import /m.test(model), false, "model.ts must stay dependency-free");

// 5. The state route is runtime-resolved (no static build-time read).
const route = read("src/app/api/governance/state/route.ts");
assert.ok(route.includes('dynamic = "force-dynamic"'), "state route must be force-dynamic");
assert.ok(route.includes("loadGovernanceConfig"), "state route must load runtime config");
assert.ok(route.includes("readGovernanceSnapshot"), "state route must read chain state");

// 6. The audit log is a separate store, never the analytics pipeline.
const auditStore = read(`${GOVERNANCE_DIR}/auditStore.ts`);
assert.ok(auditStore.includes("admin_governance_audit"), "audit store name must be distinct");
assert.equal(
  /from\s+["'].*analytics/.test(auditStore),
  false,
  "audit store must not import the analytics pipeline",
);

// 7. The dashboard mounts the governance control surface in the existing dashboard.
const adminData = read("src/components/adminData/adminData.tsx");
assert.ok(adminData.includes("GovernancePanel"), "existing admin dashboard must mount GovernancePanel");

console.log(
  `governance snapshot ok: ${files.length} modules, on-chain admin set, force-dynamic route, no build-time admin list, no hard-coded admin address`,
);
