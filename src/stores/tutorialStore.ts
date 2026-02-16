import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string; 
  position: 'top' | 'bottom' | 'left' | 'right';
  skipable?: boolean;
}

export interface TutorialState {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  hasCompletedTutorial: boolean;
  isManualStart: boolean;
}

export interface TutorialActions {
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
  setCurrentStep: (step: number) => void;
  setIsActive: (isActive: boolean) => void;
}

export type TutorialStore = TutorialState & TutorialActions;

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Phreaking Fun!",
    description: "This interactive guide will walk you through all the features. Let's get started!",
    target: "",
    position: "bottom",
    skipable: false,
  },
  {
    id: "connect-wallet",
    title: "Connect Your Wallet",
    description: "First, you need to connect your wallet to interact with the Phreaking boxes. Click on the 'Connect Wallet' button in the header.",
    target: "[data-testid='connect-wallet-button']",
    position: "bottom",
    skipable: false,
  },
  {
    id: "select-box",
    title: "Select a Mystery Box",
    description: "Choose one of the available Phreaking boxes. Each box offers different rewards and experiences. Click on any available box to proceed.",
    target: "[data-testid='mystery-box-grid']",
    position: "top",
    skipable: false,
  },
  {
    id: "enter-amount",
    title: "Enter Amount",
    description: "Enter the amount you want to spend on the Phreaking Tools. You can choose different tokens and amounts based on your preference.",
    target: "[data-testid='amount-input']",
    position: "left",
    skipable: false,
  },
  {
    id: "drag-to-purchase",
    title: "Drag to Purchase",
    description: "Finally, drag the purchase button to confirm your transaction. This unique interface ensures intentional purchases.",
    target: "[data-testid='purchase-slider']",
    position: "top",
    skipable: false,
  },
];

const TUTORIAL_STORAGE_KEY = "dfk-mysterybox-tutorial-completed";

const getHasCompletedFromStorage = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true';
};

const saveCompletionToStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
  }
};

const clearCompletionFromStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
  }
};

const initialState: TutorialState = {
  isActive: false,
  currentStep: 0,
  steps: TUTORIAL_STEPS,
  hasCompletedTutorial: getHasCompletedFromStorage(),
  isManualStart: false,
};

export const useTutorialStore = create<TutorialStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      startTutorial: () => {
        set((state) => {
          state.isActive = true;
          state.currentStep = 0;
          state.isManualStart = true;
        });
      },

      nextStep: () => {
        set((state) => {
          const nextStepIndex = state.currentStep + 1;
          
          if (nextStepIndex >= state.steps.length) {
            saveCompletionToStorage();
            state.isActive = false;
            state.currentStep = 0;
            state.hasCompletedTutorial = true;
            state.isManualStart = false;
          } else {
            state.currentStep = nextStepIndex;
          }
        });
      },

      skipTutorial: () => {
        saveCompletionToStorage();
        set((state) => {
          state.isActive = false;
          state.currentStep = 0;
          state.hasCompletedTutorial = true;
          state.isManualStart = false;
        });
      },

      completeTutorial: () => {
        saveCompletionToStorage();
        set((state) => {
          state.isActive = false;
          state.currentStep = 0;
          state.hasCompletedTutorial = true;
          state.isManualStart = false;
        });
      },

      resetTutorial: () => {
        clearCompletionFromStorage();
        set((state) => {
          state.isActive = false;
          state.currentStep = 0;
          state.hasCompletedTutorial = false;
          state.isManualStart = false;
        });
      },

      setCurrentStep: (step: number) => {
        set((state) => {
          state.currentStep = step;
        });
      },

      setIsActive: (isActive: boolean) => {
        set((state) => {
          state.isActive = isActive;
        });
      },
    }))
  )
);

export const selectTutorialState = (state: TutorialStore) => ({
  isActive: state.isActive,
  currentStep: state.currentStep,
  steps: state.steps,
  hasCompletedTutorial: state.hasCompletedTutorial,
  isManualStart: state.isManualStart,
});

export const selectCurrentTutorialStep = (state: TutorialStore) => 
  state.steps[state.currentStep];

export const selectIsTutorialActive = (state: TutorialStore) => state.isActive;
export const selectHasCompletedTutorial = (state: TutorialStore) => state.hasCompletedTutorial;
export const selectTutorialProgress = (state: TutorialStore) => ({
  current: state.currentStep + 1,
  total: state.steps.length,
  percentage: ((state.currentStep + 1) / state.steps.length) * 100,
});

if (typeof window !== 'undefined') {
  const store = useTutorialStore.getState();
  if (store.hasCompletedTutorial !== getHasCompletedFromStorage()) {
    useTutorialStore.setState({
      hasCompletedTutorial: getHasCompletedFromStorage(),
    });
  }
}
