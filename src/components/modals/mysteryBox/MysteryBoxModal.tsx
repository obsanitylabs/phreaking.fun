import React, { useEffect, useState } from "react";
import FrameMysteryBox from "./FrameMysteryBox";
import SidebarModal from "./sidebarModal";
import InitialStep from "./modalSteps/InitialStep";
import ProcessingStep from "./modalSteps/ProcessingStep";
import FinishedStep from "./modalSteps/FinishedStep";
import ReceiptModal from "../receiptModal/ReceiptModal";
import AnimatedButton from "../../ui/AnimatedButton";
import FinishButton from "../../ui/FinishButton";
import { useMysteryBoxStore } from "@/stores";
import { useBlockchain } from "@/hooks/useBlockchain";

interface MysteryBoxModalProps {
  title: string;
  image: string;
  onClose: () => void;
  onFinish: () => void;
}

const DESCRIPTION = `The truest of all mysteries!\n\n> Approve the transaction and \n randomly trigger the smart \n contracts of any of the other \n boxes.\n\n> Strap your seatbelt for a surprise that can blow your mind!_`;

const CLIP_PATH =
  "polygon(25px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 25px)";
const ANIMATION_DURATION = 300;

const MysteryBoxModal: React.FC<MysteryBoxModalProps> = ({
  title,
  image,
  onClose,
  onFinish,
}) => {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const mysteryBoxState = useMysteryBoxStore();
  const { resetState } = useMysteryBoxStore();
  const { resetPurchaseData } = useBlockchain();

  useEffect(() => {
    setShow(true);
    resetState();
  }, [resetState]);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  useEffect(() => {
    if (mysteryBoxState.step === "finished" && mysteryBoxState.transactionHash && !showReceipt) {
      const timer = setTimeout(() => {
        setShowReceipt(true);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [mysteryBoxState.step, mysteryBoxState.transactionHash, showReceipt]);

  const handleClose = () => {
    setIsClosing(true);
    setShow(false);
    setTimeout(() => {
      onClose();
      resetState();
      setShowReceipt(false);
    }, ANIMATION_DURATION);
  };

  const handleFinishClick = () => {
    if (mysteryBoxState.step === "finished" && mysteryBoxState.transactionHash) {
      setShowReceipt(true);
    } else {
      setIsClosing(true);
      setShow(false);
      setTimeout(() => {
        onFinish();
        resetState();
        setShowReceipt(false);
      }, ANIMATION_DURATION);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    handleClose();
  };

  const handleRestake = () => {
    setShowReceipt(false);
    resetState();
    resetPurchaseData();
  };

  const getReceiptData = () => {
    const rewards = mysteryBoxState.rewards || [];
    const primaryReward = rewards.length > 0 ? rewards[0] : null;

    return {
      boxImage: image,
      coinIcon: primaryReward
        ? getTokenIcon(primaryReward.tokenSymbol)
        : "/assets/ethereum.svg",
      coinName: primaryReward?.tokenSymbol || "UNKNOWN",
      amount: primaryReward?.formattedValue || "0.000000",
    };
  };

  const getTokenIcon = (tokenSymbol: string) => {
    switch (tokenSymbol.toUpperCase()) {
      case "ETH":
        return "/assets/ethereum.svg";
      case "USDC":
        return "/tokens/usdc.png";
      case "USDT":
        return "/tokens/usdt.svg";
      case "LINK":
        return "/assets/chainlink.svg";
      case "WETH":
        return "/assets/weth.svg";
      default:
        return "/tokens/usdc.png"; 
    }
  };

  const receiptData = getReceiptData();

  const modalClasses = `fixed inset-0 flex items-center justify-center bg-terminal-black/80 z-50 transition-opacity duration-300`;
  const modalContentClasses = `w-[650px] max-w-full font-mono text-terminal-white p-[1px] bg-terminal-green transition-all duration-300 ${
    show ? "opacity-100 scale-100" : "opacity-0 scale-95"
  }`;

  return (
    <>
      {!showReceipt && (
        <div className={modalClasses} style={{ opacity: isClosing ? 0 : 1 }}>
          <FrameMysteryBox
            position="left"
            orange={mysteryBoxState.step === "processing"}
          />
          <FrameMysteryBox
            position="right"
            orange={mysteryBoxState.step === "processing"}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: 4,
              position: "relative",
            }}
          >
            <SidebarModal step={mysteryBoxState.step} />
            <div
              className={modalContentClasses}
              style={{
                clipPath: CLIP_PATH,
                backgroundColor: mysteryBoxState.step === "processing" ? "#FD9C26" : "",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {mysteryBoxState.step === "initial" && (
                <InitialStep
                  title={title}
                  image={image}
                  onClose={handleClose}
                  description={DESCRIPTION}
                  CLIP_PATH={CLIP_PATH}
                />
              )}
              {mysteryBoxState.step === "processing" && (
                <ProcessingStep onClose={handleClose} CLIP_PATH={CLIP_PATH} />
              )}
              {mysteryBoxState.step === "finished" && (
                <FinishedStep onClose={handleClose} CLIP_PATH={CLIP_PATH} />
              )}
              {mysteryBoxState.step === "error" && (
                <InitialStep
                  title={title}
                  image={image}
                  onClose={handleClose}
                  description={DESCRIPTION}
                  CLIP_PATH={CLIP_PATH}
                />
              )}
            </div>
            {mysteryBoxState.step === "processing" && <AnimatedButton />}
            {mysteryBoxState.step === "finished" && (
              <FinishButton onClick={handleFinishClick} />
            )}
          </div>
        </div>
      )}

      {showReceipt && (
        <ReceiptModal
          boxImage={receiptData.boxImage}
          coinIcon={receiptData.coinIcon}
          coinName={receiptData.coinName}
          amount={receiptData.amount}
          onClose={handleReceiptClose}
          onRestake={handleRestake}
        />
      )}
    </>
  );
};

export default MysteryBoxModal;
