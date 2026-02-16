"use client";

import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { formatEther } from "viem";

interface Web3ContextType {
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;

  balance: string;
  balanceLoading: boolean;

  chainId: number | undefined;
  isWrongNetwork: boolean;
  switchChain: (chainId: number) => void;

  connect: () => void;
  disconnect: () => void;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function useWeb3() {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

interface Web3ContextProviderProps {
  children: ReactNode;
}

export function Web3ContextProvider({ children }: Web3ContextProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    const defaultValue: Web3ContextType = {
      address: undefined,
      isConnected: false,
      isConnecting: false,
      balance: "0",
      balanceLoading: false,
      chainId: undefined,
      isWrongNetwork: false,
      switchChain: () => {},
      connect: () => {},
      disconnect: () => {},
    };

    return (
      <Web3Context.Provider value={defaultValue}>
        {children}
      </Web3Context.Provider>
    );
  }

  return <Web3ContextProviderClient>{children}</Web3ContextProviderClient>;
}

function Web3ContextProviderClient({ children }: Web3ContextProviderProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address,
  });
  const chainId = useChainId();
  const { switchChain: switchChainWagmi } = useSwitchChain();

  const supportedChainIds = [1, 11155111];
  const isWrongNetwork = chainId ? !supportedChainIds.includes(chainId) : false;

  const value: Web3ContextType = {
    address,
    isConnected,
    isConnecting,

    balance: balance ? formatEther(balance.value) : "0",
    balanceLoading,

    chainId,
    isWrongNetwork,
    switchChain: (newChainId: number) => {
      switchChainWagmi({ chainId: newChainId });
    },

    connect: () => {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    },
    disconnect,
  };

  return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}
