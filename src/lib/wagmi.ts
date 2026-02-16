import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";

if (typeof window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).indexedDB = {
    open: () => Promise.resolve(),
    deleteDatabase: () => Promise.resolve(),
    cmp: () => 0,
    databases: () => Promise.resolve([]),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).IDBKeyRange = {
    bound: () => ({}),
    only: () => ({}),
    lowerBound: () => ({}),
    upperBound: () => ({}),
  };
}

export const config = getDefaultConfig({
  appName: "Phreaking Fun",
  projectId:  
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [mainnet, sepolia],
  ssr: true,
});
