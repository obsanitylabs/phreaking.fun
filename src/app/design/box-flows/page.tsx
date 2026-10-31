import type { Metadata } from "next";
import BoxFlowPrototype from "@/components/design/boxFlows/BoxFlowPrototype";

export const metadata: Metadata = {
  title: "Box flow prototype — phreaking.fun",
  description:
    "Simulated UX prototype for phreaking.fun mystery-box flows. No wallet connection and no transactions.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function BoxFlowsPrototypePage() {
  return <BoxFlowPrototype />;
}
