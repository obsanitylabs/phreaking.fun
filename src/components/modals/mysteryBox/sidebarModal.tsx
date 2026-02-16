import SidebarInitialStep from "./sidebarModalSteps/sidebarInitialStep";
import SidebarProcessingStep from "./sidebarModalSteps/sidebarProcessingStep";
import SidebarFinishedStep from "./sidebarModalSteps/sidebarFinishedStep";
import SidebarErrorStep from "./sidebarModalSteps/sidebarErrorStep";
import { PurchaseStep } from "@/stores/mysteryBoxStore";

interface SidebarModalProps {
  step: PurchaseStep;
}

const SidebarModal: React.FC<SidebarModalProps> = ({ step }) => {
  return (
    <>
      {step === "initial" && <SidebarInitialStep />}
      {step === "processing" && <SidebarProcessingStep />}
      {step === "finished" && <SidebarFinishedStep />}
      {step === "error" && <SidebarErrorStep />}
    </>
  );
};

export default SidebarModal;
