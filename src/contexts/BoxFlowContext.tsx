import React, { createContext, useContext, useState, useCallback } from "react";
import { BoxFlowState, BoxFlowContextType, BoxType, BoxFlowStep } from "@/types/boxFlows";
import { getBoxFlowConfig } from "@/config/boxFlowConfig";

const BoxFlowContext = createContext<BoxFlowContextType | undefined>(undefined);

const initialFlowState: BoxFlowState = {
  currentStep: "initial",
  currentStepIndex: 0,
  totalSteps: 0,
  flowConfig: {
    boxType: "blue",
    steps: ["initial", "processing", "finished"],
  },
  isCustomFlow: false,
};

export function BoxFlowProvider({ children }: { children: React.ReactNode }) {
  const [flowState, setFlowState] = useState<BoxFlowState>(initialFlowState);

  const initializeFlow = useCallback((boxType: BoxType) => {
    const config = getBoxFlowConfig(boxType);
    const isCustom = !!(config.customSteps && Object.keys(config.customSteps).length > 0);
    
    setFlowState({
      currentStep: config.steps[0],
      currentStepIndex: 0,
      totalSteps: config.steps.length,
      flowConfig: config,
      isCustomFlow: isCustom,
    });
  }, []);

  const goToNextStep = useCallback(() => {
    setFlowState(prev => {
      const nextIndex = prev.currentStepIndex + 1;
      if (nextIndex < prev.flowConfig.steps.length) {
        const nextStep = prev.flowConfig.steps[nextIndex];
        
        return {
          ...prev,
          currentStep: nextStep,
          currentStepIndex: nextIndex,
        };
      }
      return prev;
    });
  }, []);

  const goToPreviousStep = useCallback(() => {
    setFlowState(prev => {
      const prevIndex = prev.currentStepIndex - 1;
      if (prevIndex >= 0) {
        const prevStep = prev.flowConfig.steps[prevIndex];
        
        return {
          ...prev,
          currentStep: prevStep,
          currentStepIndex: prevIndex,
        };
      }
      return prev;
    });
  }, []);

  const goToStep = useCallback((targetStep: BoxFlowStep) => {
    setFlowState(prev => {
      const stepIndex = prev.flowConfig.steps.indexOf(targetStep);
      if (stepIndex !== -1) {
        return {
          ...prev,
          currentStep: targetStep,
          currentStepIndex: stepIndex,
        };
      }
      return prev;
    });
  }, []);

  const resetFlow = useCallback(() => {
    setFlowState(initialFlowState);
  }, []);

  const value: BoxFlowContextType = {
    flowState,
    goToNextStep,
    goToPreviousStep,
    goToStep,
    resetFlow,
    initializeFlow,
  };

  return (
    <BoxFlowContext.Provider value={value}>
      {children}
    </BoxFlowContext.Provider>
  );
}

export function useBoxFlow() {
  const context = useContext(BoxFlowContext);
  if (context === undefined) {
    throw new Error("useBoxFlow must be used within a BoxFlowProvider");
  }
  return context;
}
