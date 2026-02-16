import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { RewardEvent } from '@/hooks/useBlockchain';

export type PurchaseStep = "initial" | "processing" | "finished" | "error";
export type BoxType = "blue" | "white" | "silver";

export interface SelectedBox {
  title: string;
  image: string;
  description: string;
}

export interface MysteryBoxState {
  step: PurchaseStep;
  selectedBox: SelectedBox | null;
  transactionHash: `0x${string}` | undefined;
  error: string | null;
  processingTime: number;
  processingStartTime: number | null;
  rewards: RewardEvent[];
  
  isProcessing: boolean;
  isConfirming: boolean;
  isConfirmed: boolean;
  receipt: unknown;
}

export interface MysteryBoxActions {
  setSelectedBox: (box: SelectedBox | null) => void;
  purchaseBox: (
    boxType: BoxType,
    tokens: string[],
    amounts: string[],
    referralCode?: string,
  ) => Promise<void>;
  resetState: () => void;
  checkTransactionStatus: (hash: string) => Promise<void>;
  
  updateState: (updates: Partial<MysteryBoxState>) => void;
  setProcessingTime: (time: number) => void;
  setStep: (step: PurchaseStep) => void;
  setError: (error: string | null) => void;
  setTransactionHash: (hash: `0x${string}` | undefined) => void;
  setRewards: (rewards: RewardEvent[]) => void;
  
  startProcessing: () => void;
  finishProcessing: (rewards?: RewardEvent[]) => void;
  errorProcessing: (error: string) => void;
}

export type MysteryBoxStore = MysteryBoxState & MysteryBoxActions;

const initialState: MysteryBoxState = {
  step: "initial",
  selectedBox: null,
  transactionHash: undefined,
  error: null,
  processingTime: 0,
  processingStartTime: null,
  rewards: [],
  isProcessing: false,
  isConfirming: false,
  isConfirmed: false,
  receipt: null,
};

export const useMysteryBoxStore = create<MysteryBoxStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      setSelectedBox: (box: SelectedBox | null) => {
        set((state) => {
          state.selectedBox = box;
        });
      },

      purchaseBox: async (
        boxType: BoxType,
        tokens: string[],
        amounts: string[],
        referralCode: string = "",
      ) => {
        try {
          get().startProcessing();
          
          console.log('Purchase initiated for', boxType, 'with tokens:', tokens, 'amounts:', amounts);
          
        } catch (error) {
          const errorMessage = error instanceof Error 
            ? error.message.includes("User rejected")
              ? "Transação cancelada pelo usuário"
              : error.message
            : "Erro desconhecido na transação";
          
          get().errorProcessing(errorMessage);
        }
      },

      resetState: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      },

      checkTransactionStatus: async (hash: string) => {
        try {
          console.log('Checking transaction status:', hash);
          
          get().finishProcessing([]);
        } catch (error) {
          get().errorProcessing(error instanceof Error ? error.message : 'Erro ao verificar status da transação');
        }
      },

      updateState: (updates: Partial<MysteryBoxState>) => {
        set((state) => {
          Object.assign(state, updates);
        });
      },

      setProcessingTime: (time: number) => {
        set((state) => {
          state.processingTime = time;
        });
      },

      setStep: (step: PurchaseStep) => {
        set((state) => {
          state.step = step;
        });
      },

      setError: (error: string | null) => {
        set((state) => {
          state.error = error;
        });
      },

      setTransactionHash: (hash: `0x${string}` | undefined) => {
        set((state) => {
          state.transactionHash = hash;
        });
      },

      setRewards: (rewards: RewardEvent[]) => {
        set((state) => {
          state.rewards = rewards;
        });
      },

      startProcessing: () => {
        set((state) => {
          state.step = "processing";
          state.error = null;
          state.processingTime = 0;
          state.processingStartTime = Date.now();
          state.isProcessing = true;
        });
      },

      finishProcessing: (rewards: RewardEvent[] = []) => {
        set((state) => {
          state.step = "finished";
          state.rewards = rewards;
          state.isProcessing = false;
          state.isConfirmed = true;
        });
      },

      errorProcessing: (error: string) => {
        set((state) => {
          state.step = "error";
          state.error = error;
          state.isProcessing = false;
        });
      },
    }))
  )
);

export const selectMysteryBoxStep = (state: MysteryBoxStore) => state.step;
export const selectMysteryBoxError = (state: MysteryBoxStore) => state.error;
export const selectMysteryBoxProcessing = (state: MysteryBoxStore) => state.isProcessing;
export const selectMysteryBoxRewards = (state: MysteryBoxStore) => state.rewards;
export const selectMysteryBoxTransactionHash = (state: MysteryBoxStore) => state.transactionHash;
export const selectMysteryBoxSelectedBox = (state: MysteryBoxStore) => state.selectedBox;
