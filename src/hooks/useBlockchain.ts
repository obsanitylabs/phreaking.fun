import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { parseUnits, formatUnits, parseEther, erc20Abi } from "viem";
import { mysteryBoxABI } from "@/abi/mysteryBoxABI";
import { currencies, getBoxId, addresses } from "@/constants/currencies";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

export interface BalanceInfo {
  balance: string;
  formattedBalance: string;
  tokenName: string;
  tokenCode: string;
}

export interface PurchaseState {
  isPending: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  error: string | null;
  transactionHash: `0x${string}` | undefined;
}

export interface RewardEvent {
  type: "reward";
  eventName: "Transfer";
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  from: string;
  to: string;
  value: string;
  formattedValue: string;
  blockNumber: bigint;
  transactionHash: string;
  logIndex: number;
}

export interface ProcessRewardsResult {
  receipt: any;
  rewards: RewardEvent[];
  success: boolean;
  message: string;
}

export const useBlockchain = () => {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const [balances, setBalances] = useState<Record<string, BalanceInfo>>({});
  const [balancesInitialized, setBalancesInitialized] = useState(false);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [purchaseAmounts, setPurchaseAmounts] = useState<string[]>([""]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>(["None"]);
  const [purchaseState, setPurchaseState] = useState<PurchaseState>({
    isPending: false,
    isConfirming: false,
    isConfirmed: false,
    error: null,
    transactionHash: undefined,
  });

  const shouldFetchBalances = useRef(false);

  const fetchWalletTokens = useCallback(async () => {
    if (!address || !isConnected || isFetchingBalances) {
      return;
    }

    setIsFetchingBalances(true);
    setBalancesInitialized(false);

    try {
      const transport = http(process.env.INFURA_API);
      const client = createPublicClient({
        chain: sepolia,
        transport,
      });

      const formattedBalances: Record<string, BalanceInfo> = {};

      try {
        const ethBalance = await client.getBalance({
          address: address as `0x${string}`,
        });
        const formattedEthBalance = formatUnits(ethBalance, 18);

        formattedBalances["Sepolia ETH"] = {
          balance: formattedEthBalance,
          formattedBalance: parseFloat(formattedEthBalance).toFixed(4),
          tokenName: "Sepolia ETH",
          tokenCode: "ETH",
        };
      } catch (error) {
        console.error('Error fetching ETH balance:', error);
      }

      const erc20Currencies = currencies.filter(
        (currency) =>
          currency.address &&
          currency.address !== "0x0000000000000000000000000000000000000000" &&
          currency.address !== "" &&
          currency.code !== "ETH",
      );

      for (let i = 0; i < erc20Currencies.length; i++) {
        const currency = erc20Currencies[i];

        try {
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }

          const balance = await client.readContract({
            address: currency.address as `0x${string}`,
            abi: [
              {
                constant: true,
                inputs: [{ name: "_owner", type: "address" }],
                name: "balanceOf",
                outputs: [{ name: "balance", type: "uint256" }],
                type: "function",
              },
            ],
            functionName: "balanceOf",
            args: [address as `0x${string}`],
          });

          const formattedBalance = formatUnits(
            balance as bigint,
            currency.decimals,
          );

          formattedBalances[currency.name] = {
            balance: formattedBalance,
            formattedBalance: parseFloat(formattedBalance).toFixed(4),
            tokenName: currency.name,
            tokenCode: currency.code,
          };
        } catch (error) {
          console.error('Error fetching ERC20 balance:', error);
        }
      }

      setBalances(formattedBalances);
      setBalancesInitialized(true);
    } catch (error) {
      console.error('Error fetching balances:', error);
    } finally {
      setIsFetchingBalances(false);
    }
  }, [address, isConnected, isFetchingBalances]);

  const approveTokens = useCallback(
    async (tokenAddresses: string[], amounts: string[]) => {
      if (!address || !isConnected || !publicClient) throw new Error("Wallet not connected");

      const tokensToApprove = tokenAddresses.filter(
        (addr) =>
          addr !== "0x0000000000000000000000000000000000000000" && addr !== "",
      );

      for (let i = 0; i < tokensToApprove.length; i++) {
        const tokenAddress = tokensToApprove[i];
        const currency = currencies.find((c) => c.address === tokenAddress);
        if (!currency) continue;

        try {
          const allowance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: erc20Abi,
            functionName: "allowance",
            args: [address, addresses.mysteryBoxAddress as `0x${string}`],
          });

          const requiredAmount = parseUnits(amounts[i], currency.decimals);
          
          const approvalAmount = requiredAmount;
          

          if (!allowance || allowance < requiredAmount) {
            const approveTx = await writeContractAsync({
              address: tokenAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: "approve",
              args: [
                addresses.mysteryBoxAddress as `0x${string}`,
                approvalAmount, 
              ],
            });
            
            const receipt = await publicClient.waitForTransactionReceipt({
              hash: approveTx,
            });
            
            if (receipt.status === "reverted") {
              throw new Error(`Aprovação de ${currency.code} falhou`);
            }
            
            const newAllowance = await publicClient.readContract({
              address: tokenAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: "allowance",
              args: [address, addresses.mysteryBoxAddress as `0x${string}`],
            });
            
            
            if (newAllowance < requiredAmount) {
              throw new Error(`Aprovação de ${currency.code} não foi suficiente. Esperado: ${requiredAmount}, Obtido: ${newAllowance}`);
            }
          } else {
            console.log(`Token ${currency.code} does not require approval`);
          }
        } catch (error) {
          throw new Error(`Failed to approve token ${currency.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    },
    [address, isConnected, publicClient, writeContractAsync],
  );

  const formatTokenAmount = useCallback(
    (rawValue: string, decimals: number) => {
      try {
        const formatted = formatUnits(BigInt(rawValue), decimals);
        const num = parseFloat(formatted);
        return num.toFixed(6);
      } catch (error) {
        return "0.000000";
      }
    },
    [],
  );

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
                transferEvents.push({
                  type: "reward",
                  eventName: "Transfer",
                  tokenAddress: log.address,
                  tokenSymbol: tokenInfo.code,
                  tokenName: tokenInfo.name,
                  from: fromAddress,
                  to: toAddress,
                  value: value,
                  formattedValue: formatTokenAmount(value, tokenInfo.decimals),
                  blockNumber: log.blockNumber,
                  transactionHash: transactionReceipt.transactionHash,
                  logIndex: log.logIndex,
                });
              }
            }
          }
        } catch (error) {
          console.error('Error processing transfer events:', error);
        }
      }

      return transferEvents;
    },
    [address, formatTokenAmount],
  );

  const buyMysteryBox = useCallback(
    async (
      boxId: number,
      amounts: string[],
      tokenAddresses: string[],
    ): Promise<ProcessRewardsResult> => {
      try {
        setPurchaseState((prev) => ({ ...prev, isPending: true, error: null }));

        if (!address || !isConnected) {
          throw new Error("Wallet not connected");
        }

        amounts.forEach((amount) => {
          const numAmount = parseFloat(amount);
          if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error(`Invalid amount: ${amount}`);
          }
        });

        if (selectedTokens.includes("None")) {
          throw new Error("Please select a valid token for all rows");
        }

        selectedTokens.forEach((code, index) => {
          const currency = currencies.find((c) => c.code === code);
          if (!currency) return;

          let userBalance;
          if (code === "ETH") {
            userBalance = parseFloat(balances["Sepolia ETH"]?.balance || "0");
          } else {
            userBalance = parseFloat(balances[currency.name]?.balance || "0");
          }

          const purchaseAmount = parseFloat(amounts[index]);

          if (purchaseAmount > userBalance) {
            throw new Error(`Insufficient balance for ${currency.code}`);
          }
        });

        const erc20Tokens = tokenAddresses.filter(
          (addr) =>
            addr !== "0x0000000000000000000000000000000000000000" &&
            addr !== "",
        );

        if (erc20Tokens.length > 0) {
          await approveTokens(tokenAddresses, amounts);
        }

        const tokenAmounts = amounts.map((amount, index) => {
          const currency = currencies.find(
            (c) => c.address === tokenAddresses[index],
          );
          return parseUnits(amount, currency?.decimals || 18);
        });

        const tx = await writeContractAsync({
          address: addresses.mysteryBoxAddress as `0x${string}`,
          abi: mysteryBoxABI,
          functionName: "purchaseBox",
          args: [
            BigInt(boxId),
            tokenAddresses as `0x${string}`[],
            tokenAmounts,
            "",
          ],
          value: tokenAddresses.includes(
            "0x0000000000000000000000000000000000000000",
          )
            ? parseEther(
                amounts[
                  tokenAddresses.indexOf(
                    "0x0000000000000000000000000000000000000000",
                  )
                ],
              )
            : BigInt(0),
        });

        setPurchaseState((prev) => ({
          ...prev,
          transactionHash: tx,
          isPending: false,
          isConfirming: true,
        }));


        if (!publicClient) {
          throw new Error("Public client not available");
        }

        const receipt = await publicClient.waitForTransactionReceipt({
          hash: tx,
        });

        if (receipt.status === "reverted") {
          throw new Error("Transaction failed on the blockchain");
        }


        const rewards = await processRewards(receipt);

        setPurchaseState((prev) => ({
          ...prev,
          isConfirming: false,
          isConfirmed: true,
        }));


        return {
          receipt: receipt,
          rewards: rewards,
          success: true,
          message: `Box purchased successfully! Received ${rewards.length} rewards.`,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setPurchaseState((prev) => ({
          ...prev,
          error: errorMessage,
          isPending: false,
          isConfirming: false,
        }));
        throw error;
      }
    },
    [
      address,
      isConnected,
      selectedTokens,
      balances,
      approveTokens,
      writeContractAsync,
      publicClient,
      processRewards,
    ],
  );

  const handlePurchase = useCallback(async () => {
    try {
      setPurchaseState((prev) => ({ ...prev, error: null }));

      if (!address || !isConnected) {
        throw new Error("Wallet not connected");
      }

      purchaseAmounts.forEach((amount) => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          throw new Error(`Invalid amount: ${amount}`);
        }
      });

      if (selectedTokens.includes("None")) {
        throw new Error("Please select a valid token for all rows");
      }

      selectedTokens.forEach((code, index) => {
        const currency = currencies.find((c) => c.code === code);
        if (!currency) return;

        let userBalance;
        if (code === "ETH") {
          userBalance = parseFloat(balances["Sepolia ETH"]?.balance || "0");
        } else {
          userBalance = parseFloat(balances[currency.name]?.balance || "0");
        }

        const purchaseAmount = parseFloat(purchaseAmounts[index]);

        if (purchaseAmount > userBalance) {
          throw new Error(`Insufficient balance for ${currency.code}`);
        }
      });

      const tokenAddresses = selectedTokens
        .filter((code) => code !== "None")
        .map((code) => {
          const currency = currencies.find((c) => c.code === code);
          return currency?.address || "";
        });

      const boxId = getBoxId("blue");

      await buyMysteryBox(boxId, purchaseAmounts, tokenAddresses);
    } catch (error) {
      setPurchaseState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }, [
    address,
    isConnected,
    purchaseAmounts,
    selectedTokens,
    balances,
    buyMysteryBox,
  ]);

  useEffect(() => {
    if (isConnected && address) {
      if (!shouldFetchBalances.current) {
        shouldFetchBalances.current = true;
        fetchWalletTokens();
      }
    } else {
      if (shouldFetchBalances.current) {
        shouldFetchBalances.current = false;
        setBalancesInitialized(false);
        setBalances({});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address]); 

  const refreshBalances = useCallback(() => {
    shouldFetchBalances.current = false;
    setBalancesInitialized(false);
    setIsFetchingBalances(false);

    if (address && isConnected) {
      fetchWalletTokens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [address, isConnected]); 

  const resetPurchaseData = useCallback(() => {
    setPurchaseAmounts([""]);
    setSelectedTokens(["None"]);
    setPurchaseState({
      isPending: false,
      isConfirming: false,
      isConfirmed: false,
      error: null,
      transactionHash: undefined,
    });
    setBalancesInitialized(false);
  }, []);

  return {
    buyMysteryBox,
    handlePurchase,
    fetchWalletTokens,
    refreshBalances,
    resetPurchaseData,
    processRewards,

    balances,
    balancesInitialized,

    purchaseAmounts,
    setPurchaseAmounts,
    selectedTokens,
    setSelectedTokens,

    ...purchaseState,

    address,
    isConnected,
  };
};
