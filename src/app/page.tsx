import HomeClient from "./HomeClient";

// Wallet-dependent page: never prerender.
export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeClient />;
}
