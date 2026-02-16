import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

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

export interface BoxFlowActions {
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (step: BoxFlowStep) => void;
  resetFlow: () => void;
  initializeFlow: (boxType: BoxType) => void;
  setCurrentStep: (step: BoxFlowStep, index?: number) => void;
}

export type BoxFlowStore = BoxFlowState & BoxFlowActions;

const BOX_FLOW_CONFIGURATIONS: Record<BoxType, BoxFlowConfig> = {
  blue: {
    boxType: "blue",
    steps: ["initial", "processing", "finished", "error"],
  },
  silver: {
    boxType: "silver", 
    steps: ["initial", "processing", "finished", "error"],
  },
  white: {
    boxType: "white",
    steps: ["initial", "donation-select", "donation-confirm", "processing", "finished", "error"],
    customSteps: {
      "donation-select": {
        component: "DonationSelectStep",
        props: {
          title: "Choose Your Donation Recipient",
          subtitle: "Select an organization or spin the wheel"
        }
      },
      "donation-confirm": {
        component: "DonationConfirmStep",
        props: {
          title: "Confirm Your Donation",
          subtitle: "Review and confirm your donation details"
        }
      }
    }
  },
  green: {
    boxType: "green",
    steps: ["initial", "processing", "finished", "error"],
  },
  black: {
    boxType: "black", 
    steps: ["initial", "processing", "finished", "error"],
  },
  rainbow: {
    boxType: "rainbow",
    steps: ["initial", "processing", "finished", "error"],
  },
  gold: {
    boxType: "gold",
    steps: ["initial", "processing", "finished", "error"], 
  },
  diamond: {
    boxType: "diamond",
    steps: ["initial", "processing", "finished", "error"],
  },
  red: {
    boxType: "red",
    steps: ["initial", "processing", "finished", "error"],
  },
};

const getBoxFlowConfig = (boxType: BoxType): BoxFlowConfig => {
  return BOX_FLOW_CONFIGURATIONS[boxType] || BOX_FLOW_CONFIGURATIONS.blue;
};

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

export const useBoxFlowStore = create<BoxFlowStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialFlowState,

      initializeFlow: (boxType: BoxType) => {
        const config = getBoxFlowConfig(boxType);
        const isCustom = !!(config.customSteps && Object.keys(config.customSteps).length > 0);
        
        set((state) => {
          state.currentStep = config.steps[0];
          state.currentStepIndex = 0;
          state.totalSteps = config.steps.length;
          state.flowConfig = config;
          state.isCustomFlow = isCustom;
        });
      },

      goToNextStep: () => {
        set((state) => {
          const nextIndex = state.currentStepIndex + 1;
          if (nextIndex < state.flowConfig.steps.length) {
            const nextStep = state.flowConfig.steps[nextIndex];
            state.currentStep = nextStep;
            state.currentStepIndex = nextIndex;
          }
        });
      },

      goToPreviousStep: () => {
        set((state) => {
          const prevIndex = state.currentStepIndex - 1;
          if (prevIndex >= 0) {
            const prevStep = state.flowConfig.steps[prevIndex];
            state.currentStep = prevStep;
            state.currentStepIndex = prevIndex;
          }
        });
      },

      goToStep: (step: BoxFlowStep) => {
        set((state) => {
          const stepIndex = state.flowConfig.steps.indexOf(step);
          if (stepIndex !== -1) {
            state.currentStep = step;
            state.currentStepIndex = stepIndex;
          }
        });
      },

      setCurrentStep: (step: BoxFlowStep, index?: number) => {
        set((state) => {
          state.currentStep = step;
          if (index !== undefined) {
            state.currentStepIndex = index;
          } else {
            const stepIndex = state.flowConfig.steps.indexOf(step);
            if (stepIndex !== -1) {
              state.currentStepIndex = stepIndex;
            }
          }
        });
      },

      resetFlow: () => {
        set((state) => {
          Object.assign(state, initialFlowState);
        });
      },
    }))
  )
);

export const selectBoxFlowState = (state: BoxFlowStore) => ({
  currentStep: state.currentStep,
  currentStepIndex: state.currentStepIndex,
  totalSteps: state.totalSteps,
  flowConfig: state.flowConfig,
  isCustomFlow: state.isCustomFlow,
});

export const selectCurrentBoxFlowStep = (state: BoxFlowStore) => state.currentStep;
export const selectBoxFlowProgress = (state: BoxFlowStore) => ({
  current: state.currentStepIndex + 1,
  total: state.totalSteps,
  percentage: state.totalSteps > 0 ? ((state.currentStepIndex + 1) / state.totalSteps) * 100 : 0,
});

export const selectIsCustomFlow = (state: BoxFlowStore) => state.isCustomFlow;
export const selectFlowConfig = (state: BoxFlowStore) => state.flowConfig;
