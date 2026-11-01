// OBS-374 — pause/freeze governance model tests.
//
// Runs with the Node test runner against the pure `model.ts` module (no
// network, no wallet, no keys):
//
//   node --test src/lib/governance/governance.test.mjs
//
// Every acceptance criterion below is asserted against behaviour that would
// fail if the rule were absent or reversed.

import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_REQUIRED_QUORUM,
  SEPOLIA_CHAIN_ID,
  assertNoWalletAddressesInAnalytics,
  buildAuditRecord,
  canCollectSignature,
  decideGovernanceAction,
  deriveAdminSet,
  findWalletLeaks,
  parseGovernanceConfig,
} from "./model.ts";

const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";
const C = "0x3333333333333333333333333333333333333333";
/** Mixed-case (checksum-style) address; `0x` prefix stays lowercase. */
const MIXED = "0x" + "aA".repeat(20);

test("empty admin set is NOT STAFFED and refuses every action", () => {
  const state = deriveAdminSet({ owners: [], threshold: 0, connectedAddress: A });
  assert.equal(state.adminsConfigured, false);
  assert.equal(state.adminCount, 0);
  assert.equal(state.quorumState, "UNSTAFFED");
  assert.equal(state.requiredSignatures, 0);

  for (const action of ["PAUSE", "FREEZE", "QUEUE_UNPAUSE", "RELEASE_UNPAUSE"]) {
    const decision = decideGovernanceAction({
      state,
      action,
      signaturesCollected: 5,
      releaseUnpauseAt: 0,
      nowSeconds: 1_000,
    });
    assert.equal(decision.allowed, false, `${action} must be refused when unstaffed`);
    assert.equal(decision.outcome, "REFUSED");
    assert.equal(decision.quorumState, "UNSTAFFED");
    assert.match(decision.reason, /no admins configured|NOT STAFFED|No admins/i);
  }
});

test("owner set is normalised, deduped and sorted; non-owners are read-only", () => {
  const state = deriveAdminSet({
    owners: [B, A, A.toUpperCase(), "not-an-address"],
    threshold: 1,
    connectedAddress: C,
  });
  assert.deepEqual(state.owners, [A, B]);
  assert.equal(state.adminCount, 2);
  assert.equal(state.isOwner, false);
  const decision = decideGovernanceAction({
    state,
    action: "PAUSE",
    signaturesCollected: 2,
  });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /not an admin/i);
});

test("single-admin exception is derived, visible and permits a lone unfreeze", () => {
  const state = deriveAdminSet({ owners: [A], threshold: 1, connectedAddress: A });
  assert.equal(state.adminCount, 1);
  assert.equal(state.exceptionActive, true);
  assert.equal(state.quorumState, "SINGLE_ADMIN_EXCEPTION");

  const pause = decideGovernanceAction({ state, action: "PAUSE", signaturesCollected: 1 });
  assert.equal(pause.allowed, true);
  assert.equal(pause.quorumState, "SINGLE_ADMIN_EXCEPTION");

  const unfreeze = decideGovernanceAction({
    state,
    action: "QUEUE_UNPAUSE",
    signaturesCollected: 1,
  });
  assert.equal(unfreeze.allowed, true, "the interim exception allows a lone admin to unfreeze");
  assert.match(unfreeze.reason, /single-admin exception/);

  // Not an implicit fallback: zero signatures never unlocks the exception.
  const none = decideGovernanceAction({ state, action: "QUEUE_UNPAUSE", signaturesCollected: 0 });
  assert.equal(none.allowed, false);
});

test("2-of-3 quorum: unfreeze refused below quorum, allowed at threshold", () => {
  const state = deriveAdminSet({
    owners: [A, B, C],
    threshold: 2,
    connectedAddress: A,
  });
  assert.equal(state.exceptionActive, false);
  assert.equal(state.quorumState, "ENFORCED");
  assert.equal(state.requiredSignatures, 2);

  const one = decideGovernanceAction({ state, action: "QUEUE_UNPAUSE", signaturesCollected: 1 });
  assert.equal(one.allowed, false);
  assert.equal(one.outcome, "REFUSED");
  assert.equal(one.signaturesNeeded, 1);
  assert.match(one.reason, /1 of 2 signatures collected — need 1 more/);
  assert.match(one.reason, /Not broadcasting below the Safe threshold/);

  const two = decideGovernanceAction({ state, action: "QUEUE_UNPAUSE", signaturesCollected: 2 });
  assert.equal(two.allowed, true);
  assert.equal(two.quorumState, "ENFORCED");
});

test("collecting a signature is allowed below quorum; broadcasting is not", () => {
  const state = deriveAdminSet({ owners: [A, B, C], threshold: 2, connectedAddress: A });
  const collect = canCollectSignature({ state, readOk: true, chainId: SEPOLIA_CHAIN_ID });
  assert.equal(collect.allowed, true);
  const broadcast = decideGovernanceAction({
    state,
    action: "QUEUE_UNPAUSE",
    signaturesCollected: 1,
  });
  assert.equal(broadcast.allowed, false);
});

test("a second admin lifts the exception automatically", () => {
  const before = deriveAdminSet({ owners: [A], threshold: 1, connectedAddress: A });
  assert.equal(before.exceptionActive, true);

  // addOwnerWithThreshold sets threshold 2 and a second owner — on-chain config,
  // not a dashboard setting.
  const after = deriveAdminSet({ owners: [A, B], threshold: 2, connectedAddress: A });
  assert.equal(after.exceptionActive, false);
  assert.equal(after.quorumState, "ENFORCED");
  const one = decideGovernanceAction({ state: after, action: "QUEUE_UNPAUSE", signaturesCollected: 1 });
  assert.equal(one.allowed, false, "a single signature no longer suffices");
});

test("misconfiguration (2+ owners, threshold below policy) fails closed", () => {
  const state = deriveAdminSet({ owners: [A, B], threshold: 1, connectedAddress: A });
  assert.equal(state.misconfigured, true);
  assert.equal(state.quorumState, "MISCONFIGURED");
  const decision = decideGovernanceAction({
    state,
    action: "QUEUE_UNPAUSE",
    signaturesCollected: 5,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.quorumState, "MISCONFIGURED");
  assert.match(decision.reason, /misconfigured/i);
  assert.equal(state.requiredQuorum, DEFAULT_REQUIRED_QUORUM);
});

test("unreadable Safe / RPC refuses everything (fail closed)", () => {
  const state = deriveAdminSet({ owners: [A], threshold: 1, connectedAddress: A });
  const decision = decideGovernanceAction({
    state,
    action: "PAUSE",
    signaturesCollected: 1,
    readOk: false,
  });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /could not be read|stale/i);
});

test("wrong chain refuses every action", () => {
  const state = deriveAdminSet({ owners: [A], threshold: 1, connectedAddress: A });
  const decision = decideGovernanceAction({
    state,
    action: "PAUSE",
    signaturesCollected: 1,
    chainId: 1,
    expectedChainId: SEPOLIA_CHAIN_ID,
  });
  assert.equal(decision.allowed, false);
  assert.match(decision.reason, /Sepolia-only/);
});

test("releaseUnpause is refused before the 24h timelock and allowed after", () => {
  const state = deriveAdminSet({ owners: [A], threshold: 1, connectedAddress: A });
  const early = decideGovernanceAction({
    state,
    action: "RELEASE_UNPAUSE",
    signaturesCollected: 0,
    releaseUnpauseAt: 2_000_000_000,
    nowSeconds: 1_999_999_999,
  });
  assert.equal(early.allowed, false);
  assert.match(early.reason, /timelocked until/);

  const late = decideGovernanceAction({
    state,
    action: "RELEASE_UNPAUSE",
    signaturesCollected: 0,
    releaseUnpauseAt: 2_000_000_000,
    nowSeconds: 2_000_000_000,
  });
  assert.equal(late.allowed, true);
});

test("audit record carries the OBS-414 §6 schema", () => {
  const state = deriveAdminSet({ owners: [A], threshold: 1, connectedAddress: A });
  const record = buildAuditRecord({
    requestId: "req-1",
    timestamp: "2026-11-01T00:00:00.000Z",
    chainId: SEPOLIA_CHAIN_ID,
    actorWallet: MIXED,
    actorIsOwner: true,
    action: "QUEUE_UNPAUSE",
    targets: [{ address: B, name: "MysteryBox" }],
    safeAddress: C,
    safeTxHash: "0x" + "ab".repeat(32),
    safeNonce: 4,
    quorumThreshold: 1,
    quorumOwnerCount: 1,
    quorumSignatures: 1,
    quorumState: "SINGLE_ADMIN_EXCEPTION",
    outcome: "BROADCAST",
    txHash: "0x" + "cd".repeat(32),
  });
  assert.equal(record.actorWallet, MIXED.toLowerCase());
  assert.equal(record.targets[0].address, B);
  assert.equal(record.quorumState, "SINGLE_ADMIN_EXCEPTION");
  assert.equal(record.outcome, "BROADCAST");
  assert.equal(record.quorumOwnerCount, 1);
  for (const key of [
    "timestamp",
    "chainId",
    "actorWallet",
    "actorIsOwner",
    "action",
    "targets",
    "safeAddress",
    "safeTxHash",
    "safeNonce",
    "quorumThreshold",
    "quorumOwnerCount",
    "quorumSignatures",
    "quorumState",
    "outcome",
  ]) {
    assert.ok(key in record, `audit record missing ${key}`);
  }
});

test("no wallet address can reach the analytics store", () => {
  assert.equal(findWalletLeaks({ box: "red", amount: 10 }).length, 0);
  assert.deepEqual(findWalletLeaks({ actorWallet: A }), ["$.actorWallet"]);
  assert.deepEqual(findWalletLeaks({ nested: { value: A } }), ["$.nested.value"]);
  assert.throws(() => assertNoWalletAddressesInAnalytics({ wallet: A }), /wallet address/);
  assert.doesNotThrow(() => assertNoWalletAddressesInAnalytics({ box: "red", outcome: "REFUSED" }));
});

test("runtime config parses safely and never invents an address", () => {
  const unset = parseGovernanceConfig(null);
  assert.equal(unset.safeAddress, null);
  assert.equal(unset.requiredQuorum, DEFAULT_REQUIRED_QUORUM);
  assert.deepEqual(unset.targets, []);

  const bad = parseGovernanceConfig({ safeAddress: "0xnothex", targets: [{ address: "nope" }] });
  assert.equal(bad.safeAddress, null);
  assert.deepEqual(bad.targets, []);

  const mixedTarget = "0x" + "bB".repeat(20);
  const good = parseGovernanceConfig({
    safeAddress: MIXED,
    requiredQuorum: 3,
    targets: [
      { address: mixedTarget, name: "ReferralRegistry" },
      { address: mixedTarget.toLowerCase(), name: "duplicate" },
      { address: "not-an-address" },
    ],
  });
  assert.equal(good.safeAddress, MIXED.toLowerCase());
  assert.equal(good.requiredQuorum, 3);
  assert.deepEqual(good.targets, [
    { address: mixedTarget.toLowerCase(), name: "ReferralRegistry" },
  ]);
});

test("unstaffed state can never be bypassed by a high signature count", () => {
  const state = deriveAdminSet({ owners: [], threshold: 1, connectedAddress: A });
  const decision = decideGovernanceAction({
    state,
    action: "QUEUE_UNPAUSE",
    signaturesCollected: 99,
    releaseUnpauseAt: 0,
  });
  assert.equal(decision.allowed, false);
  assert.equal(decision.quorumState, "UNSTAFFED");
});
