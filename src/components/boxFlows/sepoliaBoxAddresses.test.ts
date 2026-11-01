import assert from "node:assert/strict";
import test from "node:test";
import { BOXES } from "../design/boxFlows/catalog";
import {
  DEPLOYED_BOX_ADDRESSES,
  SEPOLIA_BOX_ADDRESSES,
  resolveBoxAddress,
  sepoliaBoxAddress,
} from "./sepoliaBoxAddresses";

test("F3: every catalogue box resolves a deployed Sepolia address", () => {
  assert.equal(BOXES.length, 15);
  for (const box of BOXES) {
    const address = sepoliaBoxAddress(box.id);
    assert.ok(address, `${box.id} has no address`);
    assert.match(address, /^0x[a-fA-F0-9]{40}$/);
    assert.equal(address, DEPLOYED_BOX_ADDRESSES[box.id]);
  }
  const withheld = SEPOLIA_BOX_ADDRESSES as Record<string, unknown>;
  assert.equal(withheld.yellow, undefined);
  assert.equal(withheld.pink, undefined);
});

test("F3: the repo map carries the broadcast-reconciled fleet", () => {
  assert.equal(
    DEPLOYED_BOX_ADDRESSES.mystery,
    "0xcA4b2463ec6f175B3E8a1B25A966A0f7E514ee54",
  );
  assert.equal(DEPLOYED_BOX_ADDRESSES.red, "0xABcB894E43e54A1F893105232b5a2E1484D04500");
  assert.equal(
    DEPLOYED_BOX_ADDRESSES["russian-flag"],
    "0x8C5c378e52A8774Ca972e6E0f5cAA2FD96711168",
  );
});

test("resolveBoxAddress honours the dev query override, then the deployed map", () => {
  const override = "0x000000000000000000000000000000000000dEaD";
  assert.equal(resolveBoxAddress("red", `?boxAddress=${override}`), override);
  assert.equal(resolveBoxAddress("red"), DEPLOYED_BOX_ADDRESSES.red);
});
