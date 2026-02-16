import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import { mysteryBoxABI } from '@/abi/mysteryBoxABI';
import { currencies, addresses } from '@/constants/currencies';
import { BoxType } from '@/stores/mysteryBoxStore';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

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

export interface TransactionStatus {
  hash: `0x${string}`;
  status: 'pending' | 'confirmed' | 'failed' | 'timeout';
  blockNumber?: bigint;
  receipt?: any;
  error?: string;
  attempts: number;
  lastChecked: number;
}

export interface BlockchainState {
  balances: Record<string, BalanceInfo>;
  balancesInitialized: boolean;
  
  purchaseAmounts: string[];
  selectedTokens: string[];
  purchaseState: PurchaseState;
  
  transactions: Record<string, TransactionStatus>;
  
  pollingConfig: {
    interval: number;
    maxAttempts: number;
    timeout: number;
    backoffMultiplier: number;
  };
}

export interface BlockchainActions {
  fetchWalletTokens: (address: string, isConnected: boolean) => Promise<void>;
  refreshBalances: () => Promise<void>;
  setBalance: (tokenCode: string, balance: BalanceInfo) => void;
  
  setPurchaseAmounts: (amounts: string[]) => void;
  setSelectedTokens: (tokens: string[]) => void;
  resetPurchaseData: () => void;
  
  buyMysteryBox: (
    boxType: BoxType,
    tokens: string[],
    amounts: string[],
    referralCode?: string,
    wagmiWriteContract?: any, 
    publicClient?: any, 
    userAddress?: string,
    isConnected?: boolean,
    chainId?: number,
  ) => Promise<`0x${string}` | null>;
  
  trackTransaction: (hash: `0x${string}`) => void;
  updateTransactionStatus: (hash: string, updates: Partial<TransactionStatus>) => void;
  
  checkTransactionStatus: (hash: `0x${string}`, publicClient?: any) => Promise<TransactionStatus>;
  startPolling: (hash: `0x${string}`, publicClient?: any) => void;
  stopPolling: (hash: string) => void;
  
  processRewards: (receipt: any, userAddress?: string) => Promise<RewardEvent[]>;
  
  updatePurchaseState: (updates: Partial<PurchaseState>) => void;
  setError: (error: string | null) => void;
  
  approveTokens: (tokenAddresses: string[], amounts: string[], wagmiWriteContract?: any, publicClient?: any, userAddress?: string, isConnected?: boolean) => Promise<void>;
}

export type BlockchainStore = BlockchainState & BlockchainActions;

const initialState: BlockchainState = {
  balances: {},
  balancesInitialized: false,
  purchaseAmounts: [""],
  selectedTokens: ["None"],
  purchaseState: {
    isPending: false,
    isConfirming: false,
    isConfirmed: false,
    error: null,
    transactionHash: undefined,
  },
  transactions: {},
  pollingConfig: {
    interval: 3000,  
    maxAttempts: 100, 
    timeout: 300000,  
    backoffMultiplier: 1.2,
  },
};

const pollingIntervals: Record<string, NodeJS.Timeout> = {};

const BOX_IDS: Record<BoxType, number> = {
  blue: 0,
  white: 2,
  silver: 1,
};

export const useBlockchainStore = create<BlockchainStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      fetchWalletTokens: async (address: string, isConnected: boolean) => {
        if (!address || !isConnected) return;

        try {
          set((state) => {
            state.balancesInitialized = false;
          });

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

          set((state) => {
            state.balances = formattedBalances;
            state.balancesInitialized = true;
          });
        } catch (error) {
          console.error('Error fetching balances:', error);
        }
      },

      refreshBalances: async () => {
        console.log('Refreshing balances - to be implemented with wagmi dependencies');
      },

      setBalance: (tokenCode: string, balance: BalanceInfo) => {
        set((state) => {
          state.balances[tokenCode] = balance;
        });
      },

      setPurchaseAmounts: (amounts: string[]) => {
        set((state) => {
          state.purchaseAmounts = amounts;
        });
      },

      setSelectedTokens: (tokens: string[]) => {
        set((state) => {
          state.selectedTokens = tokens;
        });
      },

      resetPurchaseData: () => {
        set((state) => {
          state.purchaseAmounts = [""];
          state.selectedTokens = ["None"];
          state.purchaseState = {
            isPending: false,
            isConfirming: false,
            isConfirmed: false,
            error: null,
            transactionHash: undefined,
          };
          state.balancesInitialized = false;
        });
      },

      buyMysteryBox: async (
        boxType: BoxType,
        tokens: string[],
        amounts: string[],
        referralCode: string = "",
        wagmiWriteContract?: any,
        publicClient?: any,
        userAddress?: string,
        isConnected?: boolean,
        chainId?: number,
      ) => {
        if (!isConnected || !userAddress || !wagmiWriteContract) {
          throw new Error("Wallet não conectada");
        }

        if (chainId !== 1 && chainId !== 11155111) {
          throw new Error("Rede não suportada. Use Ethereum Mainnet ou Sepolia Testnet");
        }

        try {
          set((state) => {
            state.purchaseState.isPending = true;
            state.purchaseState.error = null;
          });

          const contractAddress = addresses.mysteryBoxAddress;
          const boxId = BOX_IDS[boxType];

          amounts.forEach((amount) => {
            const numAmount = parseFloat(amount);
            if (isNaN(numAmount) || numAmount <= 0) {
              throw new Error(`Invalid amount: ${amount}`);
            }
          });

          const tokenAmounts = amounts.map((amount, index) => {
            const tokenAddress = tokens[index];
            const currency = currencies.find(
              (c) =>
                c.address === tokenAddress ||
                (tokenAddress === "0x0000000000000000000000000000000000000000" &&
                  c.code === "ETH"),
            );
            const decimals = currency?.decimals || 18;
            return parseUnits(amount, decimals);
          });

          let ethValue = BigInt(0);
          const ethIndex = tokens.findIndex(
            (token) => token === "0x0000000000000000000000000000000000000000",
          );
          if (ethIndex !== -1) {
            ethValue = parseUnits(amounts[ethIndex], 18);
          }

          const erc20Tokens = tokens.filter(
            (addr) => addr !== "0x0000000000000000000000000000000000000000" && addr !== "",
          );
          if (erc20Tokens.length > 0) {
            await get().approveTokens(erc20Tokens, amounts, wagmiWriteContract, publicClient, userAddress, isConnected);
          }

          const result = await wagmiWriteContract({
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

          set((state) => {
            state.purchaseState.isPending = false;
            state.purchaseState.transactionHash = result;
          });

          get().trackTransaction(result);

          return result;
        } catch (error) {
          set((state) => {
            state.purchaseState.isPending = false;
            state.purchaseState.error = error instanceof Error ? error.message : 'Unknown error';
          });
          throw error;
        }
      },

      trackTransaction: (hash: `0x${string}`) => {
        set((state) => {
          state.transactions[hash] = {
            hash,
            status: 'pending',
            attempts: 0,
            lastChecked: Date.now(),
          };
        });
        
      },

      updateTransactionStatus: (hash: string, updates: Partial<TransactionStatus>) => {
        set((state) => {
          if (state.transactions[hash]) {
            Object.assign(state.transactions[hash], updates);
          }
        });
      },

      checkTransactionStatus: async (hash: `0x${string}`, publicClient?: any) => {
        const transaction = get().transactions[hash];
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        if (!publicClient) {
          throw new Error('Public client not available');
        }

        try {
          const tx = await publicClient.getTransaction({ hash });
          if (!tx) {
            get().updateTransactionStatus(hash, {
              status: 'failed',
              error: 'Transaction not found on blockchain',
            });
            throw new Error('Transaction not found on blockchain');
          }

          const receipt = await publicClient.getTransactionReceipt({ hash });
          
          if (receipt.status === 'reverted') {
            get().updateTransactionStatus(hash, {
              status: 'failed',
              error: 'Transaction reverted',
              receipt,
            });
          } else if (receipt.status === 'success') {
            get().updateTransactionStatus(hash, {
              status: 'confirmed',
              blockNumber: receipt.blockNumber,
              receipt,
            });
          }

          get().updateTransactionStatus(hash, {
            attempts: transaction.attempts + 1,
            lastChecked: Date.now(),
          });

          return get().transactions[hash];
        } catch (error) {
          if ((error as any)?.message?.includes('Transaction receipt not found')) {
            get().updateTransactionStatus(hash, {
              attempts: transaction.attempts + 1,
              lastChecked: Date.now(),
            });
            return transaction;
          }
          
          get().updateTransactionStatus(hash, {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      },

      startPolling: (hash: `0x${string}`, publicClient?: any) => {
        const { pollingConfig } = get();
        
        if (pollingIntervals[hash]) {
          clearInterval(pollingIntervals[hash]);
        }

        let attempts = 0;
        let currentInterval = pollingConfig.interval;

        const poll = async () => {
          const transaction = get().transactions[hash];
          if (!transaction || transaction.status !== 'pending') {
            get().stopPolling(hash);
            return;
          }

          attempts++;
          
          if (Date.now() - transaction.lastChecked > pollingConfig.timeout) {
            get().updateTransactionStatus(hash, {
              status: 'timeout',
              error: 'Transaction timeout',
            });
            get().stopPolling(hash);
            return;
          }

          if (attempts >= pollingConfig.maxAttempts) {
            get().updateTransactionStatus(hash, {
              status: 'timeout',
              error: 'Max polling attempts reached',
            });
            get().stopPolling(hash);
            return;
          }

          try {
            await get().checkTransactionStatus(hash, publicClient);
            
            const updatedTransaction = get().transactions[hash];
            if (updatedTransaction.status === 'confirmed' || updatedTransaction.status === 'failed') {
              get().stopPolling(hash);
              return;
            }
            
            currentInterval = Math.min(
              currentInterval * pollingConfig.backoffMultiplier,
              30000  
            );
            
          } catch (error) {
            console.error('Error polling transaction:', error);
          }
        };

        poll();
        
        pollingIntervals[hash] = setInterval(poll, currentInterval);
      },

      stopPolling: (hash: string) => {
        if (pollingIntervals[hash]) {
          clearInterval(pollingIntervals[hash]);
          delete pollingIntervals[hash];
        }
      },

      processRewards: async (receipt: any, userAddress?: string) => {
        if (!receipt.logs || !userAddress) {
          return [];
        }

        const logs = receipt.logs;
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
        const transferTopic = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

        const formatTokenAmount = (rawValue: string, decimals: number) => {
          try {
            const formatted = formatUnits(BigInt(rawValue), decimals);
            const num = parseFloat(formatted);
            return num.toFixed(6);
          } catch (error) {
            return "0.000000";
          }
        };

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

              if (toAddress.toLowerCase() === userAddress.toLowerCase()) {
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
                    transactionHash: receipt.transactionHash,
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

      updatePurchaseState: (updates: Partial<PurchaseState>) => {
        set((state) => {
          Object.assign(state.purchaseState, updates);
        });
      },

      setError: (error: string | null) => {
        set((state) => {
          state.purchaseState.error = error;
        });
      },

      approveTokens: async (
        tokenAddresses: string[], 
        amounts: string[], 
        wagmiWriteContract?: any, 
        publicClient?: any, 
        userAddress?: string, 
        isConnected?: boolean
      ) => {
        if (!userAddress || !isConnected || !publicClient || !wagmiWriteContract) {
          throw new Error("Wallet not connected or missing dependencies");
        }

        const tokensToApprove = tokenAddresses.filter(
          (addr) => addr !== "0x0000000000000000000000000000000000000000" && addr !== "",
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
              args: [userAddress, addresses.mysteryBoxAddress as `0x${string}`],
            });

            const requiredAmount = parseUnits(amounts[i], currency.decimals);
            const approvalAmount = requiredAmount;

            if (!allowance || allowance < requiredAmount) {
              const approveTx = await wagmiWriteContract({
                address: tokenAddress as `0x${string}`,
                abi: erc20Abi,
                functionName: "approve",
                args: [addresses.mysteryBoxAddress as `0x${string}`, approvalAmount],
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
                args: [userAddress, addresses.mysteryBoxAddress as `0x${string}`],
              });
              
              if (newAllowance < requiredAmount) {
                throw new Error(`Aprovação de ${currency.code} não foi suficiente`);
              }
            }
          } catch (error) {
            throw new Error(`Failed to approve token ${currency.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      },
    }))
  )
);

export const selectBalances = (state: BlockchainStore) => state.balances;
export const selectPurchaseState = (state: BlockchainStore) => state.purchaseState;
export const selectTransactions = (state: BlockchainStore) => state.transactions;
export const selectPurchaseAmounts = (state: BlockchainStore) => state.purchaseAmounts;
export const selectSelectedTokens = (state: BlockchainStore) => state.selectedTokens;
