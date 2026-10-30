import { SEPOLIA_BANNER } from "./copy";

export function SepoliaBanner() {
  return (
    <div
      role="status"
      data-testid="sepolia-banner"
      className="sticky top-0 z-40 border-b border-terminal-orange bg-[#1A1206] px-4 py-2 text-center"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-terminal-orange">
        {SEPOLIA_BANNER}
      </p>
    </div>
  );
}
