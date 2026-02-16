import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseUnits, parseEther } from 'viem';
import {
  DONATION_WALLETS,
  DONATION_CONTRACT_ADDRESS,
  DONATION_ORGANIZATIONS,
  DonationId
} from '@/constants/donations';
import { whiteBoxABI } from '@/abi/whiteBoxABI';
import { currencies } from '@/constants/currencies';

interface DonationData {
  donationId: DonationId;
  amountETH: string;
  tokenAddresses?: string[];
  tokenAmounts?: string[];
  tokenCodes?: string[];
}

export interface NFTReceiptData {
  fromAddress: string;
  toAddress: string;
  recipientName: string;
  timestamp: number;
  tokenName: string;
  tokenAmount: string;
  valueAtTransfer: string;
  transactionHash: string;
  donationId: DonationId;
  chainId: number;
}

export function useDonation() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDonationId, setSelectedDonationId] = useState<DonationId | null>(null);
  const [nftReceiptData, setNftReceiptData] = useState<NFTReceiptData | null>(null);

  const { address } = useAccount();
  const { writeContractAsync, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const getRandomDonationId = useCallback((): DonationId => {
    const donationIds = [1, 2, 3, 4, 5, 6] as const;
    const randomIndex = Math.floor(Math.random() * donationIds.length);
    const selectedId = donationIds[randomIndex];

    setSelectedDonationId(selectedId);
    return selectedId;
  }, []);

  const donate = useCallback(async (donationData: DonationData) => {
    try {
      setIsLoading(true);

      if (!address) {
        throw new Error("Wallet not connected");
      }

      if (!donationData.amountETH) {
        throw new Error("Amount is required");
      }

      if (typeof donationData.amountETH !== 'string') {
        throw new Error(`Amount must be a string, received: ${typeof donationData.amountETH}`);
      }

      const amountString = donationData.amountETH.trim();
      if (amountString === '' || isNaN(parseFloat(amountString))) {
        throw new Error(`Invalid amount: "${amountString}". Must be a valid number greater than 0`);
      }

      const numericAmount = parseFloat(amountString);
      if (numericAmount <= 0) {
        throw new Error(`Amount must be greater than 0, received: ${numericAmount}`);
      }

      // Build token arrays for the contract call
      let tokenAddresses: `0x${string}`[] = [];
      let tokenAmounts: bigint[] = [];
      let ethValue = BigInt(0);
      let primaryTokenName = "ETH";
      let primaryTokenAmount = amountString;

      if (donationData.tokenAddresses && donationData.tokenAmounts && donationData.tokenCodes) {
        tokenAddresses = donationData.tokenAddresses as `0x${string}`[];
        tokenAmounts = donationData.tokenAmounts.map((amount, index) => {
          const code = donationData.tokenCodes?.[index] || "ETH";
          const currency = currencies.find(c => c.code === code);
          return parseUnits(amount, currency?.decimals || 18);
        });

        // Calculate ETH value for native ETH entries
        donationData.tokenAddresses.forEach((addr, index) => {
          if (addr === "0x0000000000000000000000000000000000000000") {
            ethValue = parseUnits(donationData.tokenAmounts![index], 18);
          }
        });

        primaryTokenName = donationData.tokenCodes[0] || "ETH";
        primaryTokenAmount = donationData.tokenAmounts[0] || amountString;
      } else {
        // ETH-only donation
        tokenAddresses = ["0x0000000000000000000000000000000000000000" as `0x${string}`];
        tokenAmounts = [parseEther(amountString)];
        ethValue = parseEther(amountString);
        primaryTokenName = "ETH";
        primaryTokenAmount = amountString;
      }

      // Call the White Box contract's donate() function
      const tx = await writeContractAsync({
        address: DONATION_CONTRACT_ADDRESS as `0x${string}`,
        abi: whiteBoxABI,
        functionName: "donate",
        args: [
          BigInt(donationData.donationId),
          tokenAddresses,
          tokenAmounts,
        ],
        value: ethValue,
      });

      // Build NFT receipt data
      const receiptData: NFTReceiptData = {
        fromAddress: address,
        toAddress: DONATION_WALLETS[donationData.donationId],
        recipientName: DONATION_ORGANIZATIONS[donationData.donationId]?.name || `Donation #${donationData.donationId}`,
        timestamp: Date.now(),
        tokenName: primaryTokenName,
        tokenAmount: primaryTokenAmount,
        valueAtTransfer: amountString,
        transactionHash: tx,
        donationId: donationData.donationId,
        chainId: 11155111,
      };
      setNftReceiptData(receiptData);

      return tx;
    } finally {
      setIsLoading(false);
    }
  }, [address, writeContractAsync]);

  const validateDonation = useCallback((amountETH: string): { isValid: boolean; error?: string } => {
    if (!amountETH) {
      return { isValid: false, error: "Amount is required" };
    }

    if (typeof amountETH !== 'string') {
      return { isValid: false, error: "Amount must be a string" };
    }

    const trimmedAmount = amountETH.trim();
    if (trimmedAmount === '') {
      return { isValid: false, error: "Amount cannot be empty" };
    }

    const amount = parseFloat(trimmedAmount);
    if (isNaN(amount)) {
      return { isValid: false, error: "Amount must be a valid number" };
    }

    if (amount <= 0) {
      return { isValid: false, error: "Amount must be greater than 0" };
    }

    if (amount < 0.001) {
      return { isValid: false, error: "Minimum donation is 0.001 ETH" };
    }

    if (amount > 1000) {
      return { isValid: false, error: "Maximum donation is 1000 ETH" };
    }

    return { isValid: true };
  }, []);

  const estimateTotalCost = useCallback((amountETH: string): {
    donationAmount: string;
    estimatedGasCost: string;
    totalCost: string;
  } => {
    const validation = validateDonation(amountETH);
    if (!validation.isValid) {
      return {
        donationAmount: "0",
        estimatedGasCost: "0.0005",
        totalCost: "0.0005",
      };
    }

    const donationAmount = amountETH.trim();
    const estimatedGasCost = "0.0005";
    const totalCost = (parseFloat(donationAmount) + parseFloat(estimatedGasCost)).toString();

    return {
      donationAmount,
      estimatedGasCost,
      totalCost,
    };
  }, [validateDonation]);

  const resetDonation = useCallback(() => {
    setSelectedDonationId(null);
    setIsLoading(false);
    setNftReceiptData(null);
  }, []);

  return {
    donate,
    getRandomDonationId,
    resetDonation,
    validateDonation,
    estimateTotalCost,

    selectedDonationId,
    nftReceiptData,

    hash,
    isPending,
    isLoading: isLoading || isPending,
    isConfirming,
    isSuccess,
    error,

    donationWallets: DONATION_WALLETS,
  };
}
