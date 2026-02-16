import { BoxFlowConfig, BoxType } from "@/types/boxFlows";

export const BOX_FLOW_CONFIGURATIONS: Record<BoxType, BoxFlowConfig> = {
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
    steps: ["initial", "donation-spin", "processing", "finished", "error"],
    customSteps: {
      "donation-spin": {
        component: "DonationSpinStep",
        props: {
          title: "Choose Your Donation Impact",
          subtitle: "Spin the wheel to select a charitable organization"
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

export const getBoxFlowConfig = (boxType: BoxType): BoxFlowConfig => {
  return BOX_FLOW_CONFIGURATIONS[boxType] || BOX_FLOW_CONFIGURATIONS.blue;
};

export const isCustomFlow = (boxType: BoxType): boolean => {
  const config = getBoxFlowConfig(boxType);
  return !!(config.customSteps && Object.keys(config.customSteps).length > 0);
};
