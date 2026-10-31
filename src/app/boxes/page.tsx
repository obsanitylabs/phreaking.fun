import type { Metadata } from "next";
import { BoxFlowApp } from "@/components/boxFlows/BoxFlowApp";

export const metadata: Metadata = {
  title: "Boxes — phreaking.fun Sepolia demo",
  description:
    "Sepolia testnet demo of phreaking.fun mystery-box flows. Never send real funds.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function BoxesPage() {
  return <BoxFlowApp />;
}
