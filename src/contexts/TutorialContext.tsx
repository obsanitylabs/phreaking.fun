import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string; 
  position: 'top' | 'bottom' | 'left' | 'right';
  skipable?: boolean;
}

interface TutorialState {
  isActive: boolean;
  currentStep: number;
  steps: TutorialStep[];
  hasCompletedTutorial: boolean;
  isManualStart: boolean; 
}

interface TutorialContextType {
  state: TutorialState;
  startTutorial: () => void;
  nextStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

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

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TutorialState>(() => {
    const hasCompleted = typeof window !== 'undefined' 
      ? localStorage.getItem(TUTORIAL_STORAGE_KEY) === 'true'
      : false;

    return {
      isActive: false,
      currentStep: 0,
      steps: TUTORIAL_STEPS,
      hasCompletedTutorial: hasCompleted,
      isManualStart: false,
    };
  });

  const startTutorial = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      currentStep: 0,
      isManualStart: true,
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      const nextStepIndex = prev.currentStep + 1;
      if (nextStepIndex >= prev.steps.length) {
        // Tutorial completed
        localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
        return {
          ...prev,
          isActive: false,
          currentStep: 0,
          hasCompletedTutorial: true,
          isManualStart: false,
        };
      }
      return {
        ...prev,
        currentStep: nextStepIndex,
      };
    });
  }, []);

  const skipTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setState(prev => ({
      ...prev,
      isActive: false,
      currentStep: 0,
      hasCompletedTutorial: true,
      isManualStart: false,
    }));
  }, []);

  const completeTutorial = useCallback(() => {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    setState(prev => ({
      ...prev,
      isActive: false,
      currentStep: 0,
      hasCompletedTutorial: true,
      isManualStart: false,
    }));
  }, []);

  const resetTutorial = useCallback(() => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    setState(prev => ({
      ...prev,
      isActive: false,
      currentStep: 0,
      hasCompletedTutorial: false,
      isManualStart: false,
    }));
  }, []);

  const value: TutorialContextType = {
    state,
    startTutorial,
    nextStep,
    skipTutorial,
    completeTutorial,
    resetTutorial,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
