export type BoxFlowStep = 
  | "initial" 
  | "processing" 
  | "finished" 
  | "error"
  | "donation-select"
  | "donation-spin"
  | "donation-confirm"
  | "custom-step";

export type BoxType = "white" | "blue" | "silver" | "green" | "black" | "rainbow" | "gold" | "diamond" | "red";

export interface BoxFlowConfig {
  boxType: BoxType;
  steps: BoxFlowStep[];
  customSteps?: {
    [key: string]: {
      component: string;
      props?: Record<string, any>;
    };
  };
}

export interface BoxFlowState {
  currentStep: BoxFlowStep;
  currentStepIndex: number;
  totalSteps: number;
  flowConfig: BoxFlowConfig;
  isCustomFlow: boolean;
}

export interface BoxFlowContextType {
  flowState: BoxFlowState;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: BoxFlowStep) => void;
  resetFlow: () => void;
  initializeFlow: (boxType: BoxType) => void;
}
