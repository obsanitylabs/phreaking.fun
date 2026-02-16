import React from "react";
import { BoxFlowStep } from "@/types/boxFlows";
import InitialStep from "./modalSteps/InitialStep";
import ProcessingStep from "./modalSteps/ProcessingStep";
import FinishedStep from "./modalSteps/FinishedStep";
import ErrorStep from "./modalSteps/ErrorStep";
import dynamic from "next/dynamic";

const DonationSpinStep = dynamic(
  () => import("./modalSteps/DonationSpinStep"),
  {
    loading: () => (
      <div className="bg-terminal-black text-terminal-green font-mono rounded-lg p-6 flex items-center justify-center" style={{ width: 648, height: 448 }}>
        <div className="text-terminal-green">Loading donation step...</div>
      </div>
    ),
    ssr: false
  }
);

const DonationSelectStep = dynamic(
  () => import("./modalSteps/DonationSelectStep"),
  {
    loading: () => (
      <div className="bg-terminal-black text-terminal-green font-mono rounded-lg p-6 flex items-center justify-center" style={{ width: 648, height: 448 }}>
        <div className="text-terminal-green">Loading selection step...</div>
      </div>
    ),
    ssr: false
  }
);

const DonationConfirmStep = dynamic(
  () => import("./modalSteps/DonationConfirmStep"),
  {
    loading: () => (
      <div className="bg-terminal-black text-terminal-green font-mono rounded-lg p-6 flex items-center justify-center" style={{ width: 648, height: 448 }}>
        <div className="text-terminal-green">Loading confirmation step...</div>
      </div>
    ),
    ssr: false
  }
);

interface StepRendererProps {
  step: BoxFlowStep;
  title: string;
  image: string;
  onClose: () => void;
  description: string;
  CLIP_PATH: string;
  customProps?: Record<string, any>;
  onRetry?: () => void;
}

const StepRenderer: React.FC<StepRendererProps> = ({
  step,
  title,
  image,
  onClose,
  description,
  CLIP_PATH,
  customProps = {},
  onRetry,
}) => {
  switch (step) {
    case "initial":
      return (
        <InitialStep
          title={title}
          image={image}
          onClose={onClose}
          description={description}
          CLIP_PATH={CLIP_PATH}
        />
      );

    case "processing":
      return (
        <ProcessingStep
          onClose={onClose}
          CLIP_PATH={CLIP_PATH}
        />
      );

    case "finished":
      return (
        <FinishedStep
          onClose={onClose}
          CLIP_PATH={CLIP_PATH}
        />
      );

    case "donation-select":
      return (
        <DonationSelectStep
          title={title}
          image={image}
          onClose={onClose}
          CLIP_PATH={CLIP_PATH}
          {...customProps}
        />
      );

    case "donation-confirm":
      return (
        <DonationConfirmStep
          title={title}
          image={image}
          onClose={onClose}
          CLIP_PATH={CLIP_PATH}
          {...customProps}
        />
      );

    case "donation-spin":
      return (
        <DonationSpinStep
          title={title}
          image={image}
          onClose={onClose}
          CLIP_PATH={CLIP_PATH}
          {...customProps}
        />
      );

    case "error":
      return (
        <ErrorStep
          onClose={onClose}
          CLIP_PATH={CLIP_PATH}
          onRetry={onRetry}
        />
      );

    default:
      return (
        <InitialStep
          title={title}
          image={image}
          onClose={onClose}
          description={description}
          CLIP_PATH={CLIP_PATH}
        />
      );
  }
};

export default StepRenderer;
