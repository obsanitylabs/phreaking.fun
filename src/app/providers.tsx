"use client";

import { type ReactNode } from "react";
import { Web3Provider } from "@/contexts/Web3Provider";
import { Web3ContextProvider } from "@/contexts/Web3Context";
import { SplashScreenProvider } from "@/contexts/SplashScreenContext";
import { AppLoader } from "@/components/ui/AppLoader";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SplashScreenProvider>
      <Web3Provider>
        <Web3ContextProvider>
          <AppLoader>{children}</AppLoader>
        </Web3ContextProvider>
      </Web3Provider>
    </SplashScreenProvider>
  );
}
