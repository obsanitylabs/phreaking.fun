"use client";

import "@rainbow-me/rainbowkit/styles.css";
import Image from "next/image";
import {
  RainbowKitProvider,
  darkTheme,
  Theme,
  AvatarComponent,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useAccount, useConnectors } from "wagmi";
import { config } from "@/lib/wagmi";
import merge from "lodash.merge";

const queryClient = new QueryClient();

const myCustomTheme = merge(darkTheme(), {
  colors: {
    accentColor: "#22e584",
    accentColorForeground: "#000000",
    actionButtonBorder: "transparent",
    actionButtonBorderMobile: "transparent",
    actionButtonSecondaryBackground: "#175a38",
    closeButton: "#cbcbcb",
    closeButtonBackground: "#071e13",
    connectButtonBackground: "#000000",
    connectButtonBackgroundError: "#9C001D",
    connectButtonInnerBackground: "#071e13",
    connectButtonText: "#22e584",
    connectButtonTextError: "#ffffff",
    connectionIndicator: "#22e584",
    downloadBottomCardBackground: "#071e13",
    downloadTopCardBackground: "#175a38",
    error: "#9C001D",
    generalBorder: "#35594B",
    generalBorderDim: "rgba(53, 89, 75, 0.5)",
    menuItemBackground: "#071e13",
    modalBackdrop: "rgba(0, 0, 0, 0.8)",
    modalBackground: "#000000",
    modalBorder: "#22e584",
    modalText: "#cbcbcb",
    modalTextDim: "rgba(203, 203, 203, 0.7)",
    modalTextSecondary: "#35594B",
    profileAction: "#175a38",
    profileActionHover: "#22e584",
    profileForeground: "#000000",
    selectedOptionBorder: "#22e584",
    standby: "#FD9C26",
  },
  fonts: {
    body: "'Geist Mono', monospace",
  },
  radii: {
    actionButton: "0px",
    connectButton: "0px",
    menuButton: "0px",
    modal: "0px",
    modalMobile: "0px",
  },
} as Theme);

const WalletIconAvatar: AvatarComponent = ({ address, ensImage, size }) => {
  const { connector } = useAccount();

  const baseStyle = {
    borderRadius: "0px",
    WebkitBorderRadius: "0px",
    MozBorderRadius: "0px",
    borderTopLeftRadius: "0px",
    borderTopRightRadius: "0px",
    borderBottomLeftRadius: "0px",
    borderBottomRightRadius: "0px",
    clipPath: "none",
    WebkitClipPath: "none",
    mask: "none",
    WebkitMask: "none",
  };

  if (ensImage) {
    return (
      <Image
        src={ensImage}
        width={size}
        height={size}
        style={{
          ...baseStyle,
          objectFit: "contain",
          border: "none",
          backgroundColor: "transparent",
        }}
        alt="ENS Avatar"
      />
    );
  }

  if (connector?.icon) {
    return (
      <Image
        src={connector.icon}
        width={size}
        height={size}
        style={{
          ...baseStyle,
          objectFit: "contain",
          border: "none",
          backgroundColor: "transparent",
          padding: "0px",
        }}
        alt={`${connector.name} Wallet`}
      />
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: "#22e584",
        height: size,
        width: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        fontSize: size * 0.5,
      }}
    >
      👛
    </div>
  );
};

interface Web3ProviderProps {
  children: React.ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          avatar={WalletIconAvatar}
          theme={myCustomTheme}
          modalSize="compact"
          locale="en"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
