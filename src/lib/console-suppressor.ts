export function suppressLitWarnings() {
  if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
    const originalWarn = console.warn;
    console.warn = function(...args: unknown[]) {
      const message = args.join(" ");
      if (
        message.includes("Lit is in dev mode") ||
        message.includes("reactive-element.ts") ||
        message.includes("Not recommended for production")
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };
  }
}
