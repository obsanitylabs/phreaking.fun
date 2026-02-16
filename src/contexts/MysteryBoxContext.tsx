import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { mysteryBoxABI } from "@/abi/mysteryBoxABI";
import { currencies, addresses } from "@/constants/currencies";
import { RewardEvent } from "@/hooks/useBlockchain";

export type PurchaseStep = "initial" | "processing" | "finished" | "error";

export type BoxType = "blue" | "white" | "silver";

interface SelectedBox {
  title: string;
  image: string;
  description: string;
}

interface MysteryBoxState {
  step: PurchaseStep;
  selectedBox: SelectedBox | null;
  transactionHash: `0x${string}` | undefined;
  error: string | null;
  processingTime: number;
  processingStartTime: number | null;
  rewards: RewardEvent[];
}

interface MysteryBoxContextType {
  state: MysteryBoxState;

  setSelectedBox: (box: SelectedBox | null) => void;
  purchaseBox: (
    boxType: BoxType,
    tokens: string[],
    amounts: string[],
    referralCode?: string,
  ) => Promise<void>;
  resetState: () => void;
  checkTransactionStatus: (hash: string) => Promise<void>;

  isProcessing: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  receipt: unknown;
}

const MysteryBoxContext = createContext<MysteryBoxContextType | undefined>(
  undefined,
);

const initialState: MysteryBoxState = {
  step: "initial",
  selectedBox: null,
  transactionHash: undefined,
  error: null,
  processingTime: 0,
  processingStartTime: null,
  rewards: [],
};

const BOX_IDS: Record<BoxType, number> = {
  blue: 0,
  white: 2,
  silver: 1,
};

export function MysteryBoxProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<MysteryBoxState>(initialState);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const {
    writeContract,
    isPending: isWritePending,
    error: writeError,
    data: writeData,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: state.transactionHash,
  });

  const isProcessing = isWritePending || isConfirming;

  const updateState = useCallback((updates: Partial<MysteryBoxState>) => {
    // Se estamos mudando para error ou finished, aguarda o final do ciclo do carrossel
    if ((updates.step === "error" || updates.step === "finished") && state.step === "processing") {
      const CAROUSEL_CYCLE_DURATION = 12000; // 12 segundos
      const currentTime = Date.now();
      const processingDuration = currentTime - (state.processingStartTime || currentTime);
      const timeInCurrentCycle = processingDuration % CAROUSEL_CYCLE_DURATION;
      const timeToNextCycle = CAROUSEL_CYCLE_DURATION - timeInCurrentCycle;
      
      // Se restam menos de 1 segundo para o próximo ciclo, aplica imediatamente
      if (timeToNextCycle < 1000) {
        setState((prev) => ({ ...prev, ...updates }));
      } else {
        // Aguarda o final do ciclo atual
        setTimeout(() => {
          setState((prev) => ({ ...prev, ...updates }));
        }, timeToNextCycle);
      }
    } else {
      setState((prev) => ({ ...prev, ...updates }));
    }
  }, [state.step, state.processingStartTime]);

  useEffect(() => {
    if (state.step === "processing" && state.processingStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.processingStartTime!) / 1000);
        setState((prev) => ({
          ...prev,
          processingTime: elapsed
        }));
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [state.step, state.processingStartTime]);

  const processRewards = useCallback(
    async (transactionReceipt: any): Promise<RewardEvent[]> => {
      if (!transactionReceipt.logs || !address) {
        return [];
      }

      const logs = transactionReceipt.logs;

      const knownAddresses = [
        addresses.blueBoxAddress?.toLowerCase(),
        addresses.silverBoxAddress?.toLowerCase(),
        addresses.wethAddress?.toLowerCase(),
        addresses.usdcAddress?.toLowerCase(),
        addresses.linkAddress?.toLowerCase(),
      ].filter(Boolean);

      const rewardLogs = logs.filter((log: any) =>
        knownAddresses.includes(log.address?.toLowerCase()),
      );

      const transferEvents: RewardEvent[] = [];

      const transferTopic =
        "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

      for (const log of rewardLogs) {
        try {
          if (
            log.topics &&
            log.topics[0] === transferTopic &&
            log.topics.length >= 3
          ) {
            const fromAddress = `0x${log.topics[1].slice(26)}`.toLowerCase();
            const toAddress = `0x${log.topics[2].slice(26)}`.toLowerCase();
            const value = BigInt(log.data).toString();

            if (toAddress.toLowerCase() === address.toLowerCase()) {
              const tokenInfo = currencies.find(
                (c) => c.address?.toLowerCase() === log.address?.toLowerCase(),
              );

              if (tokenInfo) {
                const formattedValue = formatUnits(
                  BigInt(value),
                  tokenInfo.decimals,
                );
                const num = parseFloat(formattedValue);

                transferEvents.push({
                  type: "reward",
                  eventName: "Transfer",
                  tokenAddress: log.address,
                  tokenSymbol: tokenInfo.code,
                  tokenName: tokenInfo.name,
                  from: fromAddress,
                  to: toAddress,
                  value: value,
                  formattedValue: num.toFixed(6),
                  blockNumber: log.blockNumber,
                  transactionHash: transactionReceipt.transactionHash,
                  logIndex: log.logIndex,
                });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching transfer events:', error);
        }
      }

      return transferEvents;
    },
    [address],
  );

  const setSelectedBox = useCallback(
    (box: SelectedBox | null) => {
      updateState({ selectedBox: box });
    },
    [updateState],
  );

  const purchaseBox = useCallback(
    async (
      boxType: BoxType,
      tokens: string[],
      amounts: string[],
      referralCode: string = "",
    ) => {
      if (!isConnected || !address) {
        updateState({
          error: "Wallet não conectada",
          step: "error",
        });
        return;
      }

      if (chainId !== 1 && chainId !== 11155111) {
        updateState({
          error: "Rede não suportada. Use Ethereum Mainnet ou Sepolia Testnet",
          step: "error",
        });
        return;
      }

      try {
        const startTime = Date.now();
        updateState({
          step: "processing",
          error: null,
          processingTime: 0,
          processingStartTime: startTime,
        });

        const contractAddress = addresses.mysteryBoxAddress;
        const boxId = BOX_IDS[boxType];

        const tokenAmounts = amounts.map((amount, index) => {
          const tokenAddress = tokens[index];
          const currency = currencies.find(
            (c) =>
              c.address === tokenAddress ||
              (tokenAddress === "0x0000000000000000000000000000000000000000" &&
                c.code === "ETH"),
          );
          const decimals = currency?.decimals || 18;
          const parsedAmount = parseUnits(amount, decimals);

          return parsedAmount;
        });

        let ethValue = BigInt(0);
        const ethIndex = tokens.findIndex(
          (token) => token === "0x0000000000000000000000000000000000000000",
        );
        if (ethIndex !== -1) {
          ethValue = parseUnits(amounts[ethIndex], 18);
        }

        const result = await writeContract({
          address: contractAddress as `0x${string}`,
          abi: mysteryBoxABI,
          functionName: "purchaseBox",
          args: [
            BigInt(boxId),
            tokens as `0x${string}`[],
            tokenAmounts,
            referralCode,
          ],
          value: ethValue,
        });

        updateState({
          processingTime: Math.floor((Date.now() - startTime) / 1000),
        });
      } catch (error) {

        const errorMessage =
          error instanceof Error
            ? error.message.includes("User rejected")
              ? "Transação cancelada pelo usuário"
              : error.message
            : "Erro desconhecido na transação";

        updateState({
          error: errorMessage,
          step: "error",
        });
      }
    },
    [isConnected, address, chainId, writeContract, updateState],
  );

  const resetState = useCallback(() => {
    setState({
      step: "initial",
      selectedBox: null,
      transactionHash: undefined,
      error: null,
      processingTime: 0,
      processingStartTime: null,
      rewards: [],
    });
  }, []);

  const checkTransactionStatus = useCallback(async (hash: string) => {
    if (!publicClient) {
      updateState({
        error: "Cliente não disponível para verificar transação",
        step: "error",
      });
      return;
    }

    try {
      updateState({
        step: "processing",
        transactionHash: hash as `0x${string}`,
        error: null,
      });

      const transaction = await publicClient.getTransaction({
        hash: hash as `0x${string}`,
      });

      if (!transaction) {
        updateState({
          error: "Transação não encontrada na blockchain",
          step: "error",
        });
        return;
      }

      const receipt = await publicClient.getTransactionReceipt({
        hash: hash as `0x${string}`,
      });

      if (receipt.status === 'reverted') {
        updateState({
          error: "Transação foi revertida (falhou) na blockchain",
          step: "error",
        });
        return;
      }

      const rewards = await processRewards(receipt);
      updateState({
        step: "finished",
        rewards: rewards,
      });
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : "Falha ao verificar status da transação",
        step: "error",
      });
    }
  }, [publicClient, updateState, processRewards]);

  React.useEffect(() => {
    if (writeData) {
      updateState({ transactionHash: writeData });
    }
  }, [writeData, updateState]);

  React.useEffect(() => {
    if (writeError) {
      const errorMessage = writeError.message.includes("User rejected")
        ? "Transação cancelada pelo usuário"
        : writeError.message;

      updateState({
        error: errorMessage,
        step: "error",
      });
    }
  }, [writeError]);

  React.useEffect(() => {
    if (isConfirmed && receipt) {
      if (receipt.status === 'reverted') {
        updateState({
          error: "Transação falhou na blockchain",
          step: "error",
        });
        return;
      }

      processRewards(receipt)
        .then((rewards) => {
          updateState({
            step: "finished",
            rewards: rewards,
          });
        })
        .catch((error) => {
          updateState({ step: "finished" });
        });
    } else if (receiptError) {
      updateState({
        error: "Erro ao confirmar transação",
        step: "error",
      });
    }
  }, [
    isConfirming,
    isConfirmed,
    receipt,
    receiptError,
    updateState,
    state.transactionHash,
    processRewards,
  ]);

  React.useEffect(() => {
    if (state.step === "processing" && state.transactionHash) {
      const timeout = setTimeout(
        () => {
          updateState({ 
            step: "error",
            error: "Timeout na transação - A transação pode ter falhado ou está pendente há muito tempo"
          });
        },
        5 * 60 * 1000, // 5 minutos
      );

      return () => clearTimeout(timeout);
    }
  }, [state.step, state.transactionHash, updateState]);

  const value: MysteryBoxContextType = {
    state,
    setSelectedBox,
    purchaseBox,
    resetState,
    checkTransactionStatus,
    isProcessing,
    isConfirming,
    isConfirmed,
    receipt,
  };

  return (
    <MysteryBoxContext.Provider value={value}>
      {children}
    </MysteryBoxContext.Provider>
  );
}

export function useMysteryBox() {
  const context = useContext(MysteryBoxContext);
  if (context === undefined) {
    throw new Error(
      "useMysteryBox deve ser usado dentro de MysteryBoxProvider",
    );
  }
  return context;
}
