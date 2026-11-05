#!/usr/bin/env bash
# Configure phreaking.fun box pool membership on the deployed Sepolia fleet (OBS-621).
#
# Why this exists: script/Deploy.s.sol registers tokens but never calls
# BoxTokenRegistry.setPoolMembership, so canUse(token, boxType) is false for every pair and
# deposits revert. This script runs the exact post-deploy call set and then verifies it.
#
# Key handling: the admin key is read from the environment only ($ADMIN_KEY). It is never
# written to disk, never passed on the command line as a literal, and never committed. Pass
# --private-key via the cast subprocess only. The admin must be the registry's
# DEFAULT_ADMIN_ROLE holder (on the OBS-321 Sepolia fleet that is the MULTISIG EOA; the
# deployer EOA renounced the role during the broadcast).
#
# Usage:
#   ADMIN_KEY=<in-memory role key> SEPOLIA_RPC_URL=<rpc> ./scripts/configure-pools-sepolia.sh [--verify-only]
#
# Exit codes: 0 = all pairs enabled + verified, 1 = a call or verification failed.

set -euo pipefail

REGISTRY="${REGISTRY:-0x43Ff92ce3eC51c96FFD4031fc85f63ea2b6BEA1D}"
NATIVE="0x0000000000000000000000000000000000000000"
USDC_E="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
WETH="0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9"
LINK="0x779877A7B0D9E8603169DdbD7836e478b4624789"
TOKENS=("$NATIVE" "$USDC_E" "$WETH" "$LINK")

BOX_NAMES=(RED BLUE GREEN MYSTERY WHITE ORANGE YELLOW PINK PURPLE RAINBOW BLACK CHECKERED SILVER GOLD DIAMOND RUSSIAN_FLAG COINGATCHA)
BOX_TYPES=(0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16)

: "${SEPOLIA_RPC_URL:?set SEPOLIA_RPC_URL}"

verify_only=0
if [[ "${1:-}" == "--verify-only" ]]; then
  verify_only=1
else
  : "${ADMIN_KEY:?set ADMIN_KEY (managed secret only; never commit or paste it)}"
fi

fail=0
if [[ "$verify_only" -eq 0 ]]; then
  echo "== configuring pool membership on registry $REGISTRY"
  for i in "${!BOX_TYPES[@]}"; do
    box="${BOX_TYPES[$i]}"
    for token in "${TOKENS[@]}"; do
      echo "   setPoolMembership($box, $token, true)"
      if ! cast send "$REGISTRY" "setPoolMembership(uint8,address,bool)" "$box" "$token" true \
          --private-key "$ADMIN_KEY" --rpc-url "$SEPOLIA_RPC_URL" >/dev/null; then
        echo "   !! call failed for box=$box token=$token" >&2
        fail=1
      fi
    done
  done
fi

echo "== verifying canUse matrix"
for i in "${!BOX_TYPES[@]}"; do
  box="${BOX_TYPES[$i]}"
  name="${BOX_NAMES[$i]}"
  row="$name($box):"
  for token in "${TOKENS[@]}"; do
    ok=$(cast call "$REGISTRY" "canUse(address,uint8)(bool)" "$token" "$box" --rpc-url "$SEPOLIA_RPC_URL" | tr -d '[:space:]')
    row="$row $token=$ok"
    if [[ "$ok" != "true" ]]; then fail=1; fi
  done
  echo "   $row"
done

if [[ "$fail" -ne 0 ]]; then
  echo "FAIL: at least one pair is not enabled" >&2
  exit 1
fi
echo "OK: all 68 pairs enabled and verified"
