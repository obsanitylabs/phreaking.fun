import React, { createContext, useContext, useState, useCallback } from "react";
import { DonationId } from "@/constants/donations";
import { currencies } from "@/constants/currencies";

export interface WhiteBoxPurchaseData {
  tokens: string[];
  amounts: string[];
  selectedTokens: string[];
  purchaseAmounts: string[];
}

export interface WhiteBoxDonationData {
  donationId: DonationId;
  recipientWallet: string;
  isSpinComplete: boolean;
  transactionHash?: string;
}

interface WhiteBoxContextType {
  purchaseData: WhiteBoxPurchaseData | null;
  setPurchaseData: (data: WhiteBoxPurchaseData) => void;
  
  donationData: WhiteBoxDonationData | null;
  setDonationData: (data: WhiteBoxDonationData) => void;
  
  getCombinedDonationData: () => {
    tokens: string[];
    amounts: string[];
    donationId: DonationId;
    totalValueETH: string;
  } | null;
  
  resetPurchaseData: () => void;
  resetDonationData: () => void;
  resetAll: () => void;
}

const WhiteBoxContext = createContext<WhiteBoxContextType | undefined>(undefined);

export function WhiteBoxProvider({ children }: { children: React.ReactNode }) {
  const [purchaseData, setPurchaseDataState] = useState<WhiteBoxPurchaseData | null>(null);
  const [donationData, setDonationDataState] = useState<WhiteBoxDonationData | null>(null);

  const setPurchaseData = useCallback((data: WhiteBoxPurchaseData) => {
    setPurchaseDataState(data);
  }, []);

  const setDonationData = useCallback((data: WhiteBoxDonationData) => {
    setDonationDataState(data);
  }, []);

  const getCombinedDonationData = () => {
    if (!purchaseData || !donationData) {
      return null;
    }

    const tokens = purchaseData.selectedTokens
      .filter((token, index) => token !== "None" && purchaseData.purchaseAmounts[index] && parseFloat(purchaseData.purchaseAmounts[index]) > 0)
      .map(tokenCode => {
        if (tokenCode === "ETH") {
          return "0x0000000000000000000000000000000000000000"; 
        }
        
        const currency = currencies.find(c => c.code === tokenCode);
        if (currency && currency.address) {
          return currency.address;
        }
        
        return "0x0000000000000000000000000000000000000000";
      });

    const amounts = purchaseData.selectedTokens
      .map((token, index) => {
        if (token !== "None" && purchaseData.purchaseAmounts[index] && parseFloat(purchaseData.purchaseAmounts[index]) > 0) {
          return purchaseData.purchaseAmounts[index];
        }
        return null;
      })
      .filter(amount => amount !== null) as string[];

    const totalValueETH = amounts.reduce((total, amount) => {
      return total + parseFloat(amount);
    }, 0).toString();

    const combinedData = {
      tokens,
      amounts,
      donationId: donationData.donationId,
      totalValueETH
    };

    return combinedData;
  };

  const resetPurchaseData = useCallback(() => {
    setPurchaseDataState(null);
  }, []);

  const resetDonationData = useCallback(() => {
    setDonationDataState(null);
  }, []);

  const resetAll = useCallback(() => {
    setPurchaseDataState(null);
    setDonationDataState(null);
  }, []);

  const value: WhiteBoxContextType = {
    purchaseData,
    setPurchaseData,
    donationData,
    setDonationData,
    getCombinedDonationData,
    resetPurchaseData,
    resetDonationData,
    resetAll,
  };

  return (
    <WhiteBoxContext.Provider value={value}>
      {children}
    </WhiteBoxContext.Provider>
  );
}

export function useWhiteBox() {
  const context = useContext(WhiteBoxContext);
  if (context === undefined) {
    throw new Error("useWhiteBox must be used within a WhiteBoxProvider");
  }
  return context;
}
