import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { DonationId } from '@/constants/donations';
import { currencies } from '@/constants/currencies';

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
  selectionMethod: 'dropdown' | 'random';
  transactionHash?: string;
}

export interface CombinedDonationData {
  tokens: string[];
  amounts: string[];
  donationId: DonationId;
  totalValueETH: string;
}

export interface WhiteBoxState {
  purchaseData: WhiteBoxPurchaseData | null;
  donationData: WhiteBoxDonationData | null;
}

export interface WhiteBoxActions {
  setPurchaseData: (data: WhiteBoxPurchaseData) => void;
  resetPurchaseData: () => void;
  
  setDonationData: (data: WhiteBoxDonationData) => void;
  resetDonationData: () => void;
  
  getCombinedDonationData: () => CombinedDonationData | null;
  resetAll: () => void;
}

export type WhiteBoxStore = WhiteBoxState & WhiteBoxActions;

const initialState: WhiteBoxState = {
  purchaseData: null,
  donationData: null,
};

export const useWhiteBoxStore = create<WhiteBoxStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      setPurchaseData: (data: WhiteBoxPurchaseData) => {
        set((state) => {
          state.purchaseData = data;
        });
      },

      resetPurchaseData: () => {
        set((state) => {
          state.purchaseData = null;
        });
      },

      setDonationData: (data: WhiteBoxDonationData) => {
        set((state) => {
          state.donationData = data;
        });
      },

      resetDonationData: () => {
        set((state) => {
          state.donationData = null;
        });
      },

      getCombinedDonationData: (): CombinedDonationData | null => {
        const { purchaseData, donationData } = get();
        
        if (!purchaseData || !donationData) {
          return null;
        }

        const tokens = purchaseData.selectedTokens
          .filter((token, index) => 
            token !== "None" && 
            purchaseData.purchaseAmounts[index] && 
            parseFloat(purchaseData.purchaseAmounts[index]) > 0
          )
          .map(tokenCode => {
            if (tokenCode === "ETH") {
              return "0x0000000000000000000000000000000000000000";
            }
            
            const currency = currencies.find(c => c.code === tokenCode);
            return currency?.address || "";
          })
          .filter(address => address !== "");

        const amounts = purchaseData.selectedTokens
          .map((token, index) => {
            if (token === "None" || !purchaseData.purchaseAmounts[index] || parseFloat(purchaseData.purchaseAmounts[index]) <= 0) {
              return "";
            }
            return purchaseData.purchaseAmounts[index];
          })
          .filter(amount => amount !== "");

        let totalValueETH = "0";
        try {
          let total = 0;
          purchaseData.selectedTokens.forEach((token, index) => {
            if (token !== "None" && purchaseData.purchaseAmounts[index]) {
              const amount = parseFloat(purchaseData.purchaseAmounts[index]);
              if (amount > 0) {
                if (token === "ETH") {
                  total += amount;
                } else {
                  const currency = currencies.find(c => c.code === token);
                  if (currency) {
                    total += amount;
                  }
                }
              }
            }
          });
          totalValueETH = total.toString();
        } catch (error) {
          console.error('Error calculating total value:', error);
          totalValueETH = "0";
        }

        return {
          tokens,
          amounts,
          donationId: donationData.donationId,
          totalValueETH,
        };
      },

      resetAll: () => {
        set((state) => {
          state.purchaseData = null;
          state.donationData = null;
        });
      },
    }))
  )
);

export const selectPurchaseData = (state: WhiteBoxStore) => state.purchaseData;
export const selectDonationData = (state: WhiteBoxStore) => state.donationData;
export const selectHasPurchaseData = (state: WhiteBoxStore) => state.purchaseData !== null;
export const selectHasDonationData = (state: WhiteBoxStore) => state.donationData !== null;
export const selectIsReadyForDonation = (state: WhiteBoxStore) => 
  state.purchaseData !== null && state.donationData !== null;
