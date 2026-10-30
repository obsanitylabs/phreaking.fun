import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Phreaking Fun — Sepolia Demo",
  description:
    "Sepolia testnet demo only. Not production. Mainnet is disabled — do not send mainnet funds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* OBS-125 first-party analytics — consent-gated SDK (public/obs-analytics.js).
            Must load before wallet-provider SDKs hydrate; sends nothing pre-consent (R2). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.OBS_ANALYTICS_PRODUCT='pff';window.OBS_BUILD_VERSION='';",
          }}
        />
        <script src="/obs-analytics.js" defer />
        {/* WagmiProvider tree — removed by e6796e8, never restored by f2a7fb1;
            without it SSR of / throws WagmiProviderNotFoundError (prod 500). */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
