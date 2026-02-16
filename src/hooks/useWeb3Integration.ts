import { useCallback } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { parseEther } from "viem";
import { useWeb3 } from "@/contexts/Web3Context";

export function useWeb3Integration() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { balance, chainId, switchChain } = useWeb3();

  const signMessage = useCallback(
    async (message: string) => {
      if (!isConnected) {
        throw new Error("Wallet not connected");
      }

      const signature = await signMessageAsync({ message });
      return signature;
    },
    [isConnected, signMessageAsync],
  );

  const hasEnoughBalance = useCallback(
    (amount: string): boolean => {
      if (!balance) return false;

      try {
        const requiredAmount = parseEther(amount);
        const currentBalance = parseEther(balance);
        return currentBalance >= requiredAmount;
      } catch {
        return false;
      }
    },
    [balance],
  );

  const formatAddress = useCallback((addr: string | undefined): string => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  return {
    address,
    isConnected,
    balance,
    chainId,

    signMessage,
    hasEnoughBalance,
    formatAddress,
    switchChain,
  };
}
