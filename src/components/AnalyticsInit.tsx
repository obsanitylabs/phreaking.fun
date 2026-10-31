"use client";

import { useEffect } from "react";
import { useAccount } from "wagmi";
import { trackWalletConnected } from "@/lib/analytics";

// OBS-354 — emits `wallet_connected` on RainbowKit/wagmi connect success AND on the
// auto-reconnect path (wagmi restores the session and `isConnected` flips true).
// Sepolia-only and once per session, enforced inside `trackWalletConnected`.
export function AnalyticsInit() {
  const { isConnected, chainId, connector } = useAccount();

  useEffect(() => {
    if (!isConnected) return;
    trackWalletConnected(chainId, connector?.id, connector?.name);
  }, [isConnected, chainId, connector?.id, connector?.name]);

  return null;
}
