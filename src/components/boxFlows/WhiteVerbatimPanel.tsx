import { WHITE_PANEL_MIN_FONT_PX } from "./copy";

interface WhiteVerbatimPanelProps {
  text: string;
  productLine: string;
  minFontPx?: number;
}

/**
 * Character-exact White Box quote. The domain is a link; the surrounding
 * sentence is not edited, shortened, or re-capitalised (spec §6.4).
 */
export function WhiteVerbatimPanel({
  text,
  productLine,
  minFontPx = WHITE_PANEL_MIN_FONT_PX,
}: WhiteVerbatimPanelProps) {
  const parts = text.split("thegivingblock.com");

  return (
    <div
      data-testid="white-verbatim-panel"
      className="border border-white/40 p-3"
    >
      <p className="text-[10px] uppercase tracking-widest text-white/40">
        Before you donate
      </p>
      <p
        data-testid="white-verbatim-text"
        data-min-font-px={minFontPx}
        className="mt-2 leading-relaxed text-white"
        style={{ fontSize: `${minFontPx}px` }}
      >
        {parts.map((part, index) => (
          <span key={index}>
            {index > 0 && (
              <a
                href="https://thegivingblock.com"
                target="_blank"
                rel="noreferrer noopener"
                className="underline decoration-white/50 underline-offset-2 hover:text-terminal-green focus:outline-none focus:ring-2 focus:ring-white"
              >
                thegivingblock.com
              </a>
            )}
            {part}
          </span>
        ))}
      </p>
      <p
        data-testid="white-product-line"
        className="mt-2 border-t border-white/15 pt-2 text-[11px] text-white/50"
      >
        {productLine}
      </p>
    </div>
  );
}
