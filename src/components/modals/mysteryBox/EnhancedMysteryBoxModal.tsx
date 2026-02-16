import React, { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useAccount } from 'wagmi';
import FrameMysteryBox from "./FrameMysteryBox";
import SidebarModal from "./sidebarModal";
import StepRenderer from "./StepRenderer";
import ReceiptModal from "../receiptModal/ReceiptModal";
import DonationReceiptModal from "../receiptModal/DonationReceiptModal";
import FrameReceiptModal from "../receiptModal/FrameReceiptModal";
import AnimatedButton from "../../ui/AnimatedButton";
import ErrorButton from "../../ui/ErrorButton";
import FinishButton from "../../ui/FinishButton";
import { 
  useMysteryBoxStore, 
  useWhiteBoxStore, 
  useBoxFlowStore, 
  useBlockchainStore,
  selectMysteryBoxStep,
  selectMysteryBoxError,
  BoxType 
} from "@/stores";
import { useDonation } from "@/hooks/useDonation";

interface EnhancedMysteryBoxModalProps {
  title: string;
  image: string;
  onClose: () => void;
  onFinish: () => void;
}

const DESCRIPTIONS: Record<string, string> = {
  white: `The P2P Exchange Mystery Box!\n\n> Approve the transaction and \n connect with charitable \n organizations through our \n donation platform.\n\n> Make an impact while unlocking your rewards!`,
  blue: `The Portfolio Swap Mystery Box!\n\n> Approve the transaction and \n swap your portfolio for \n equivalent value tokens.\n\n> Designed for minimal slippage!`,
  silver: `The Curated Swaps Mystery Box!\n\n> Approve the transaction and \n engage in value-for-value \n swaps with specially curated \n token lists.\n\n> May offer discounts or fees!`,
  default: `The truest of all mysteries!\n\n> Approve the transaction and \n randomly trigger the smart \n contracts of any of the other \n boxes.\n\n> Strap your seatbelt for a surprise that can blow your mind!_`,
};

const CLIP_PATH =
  "polygon(25px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 25px)";
const ANIMATION_DURATION = 300;

const EnhancedMysteryBoxModal: React.FC<EnhancedMysteryBoxModalProps> = ({
  title,
  image,
  onClose,
  onFinish,
}) => {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  
  const mysteryBoxState = useMysteryBoxStore();
  const mysteryBoxStep = useMysteryBoxStore(selectMysteryBoxStep);
  const mysteryBoxError = useMysteryBoxStore(selectMysteryBoxError);
  const resetState = useMysteryBoxStore(state => state.resetState);
  
  const flowState = useBoxFlowStore(state => state);
  const { initializeFlow, goToNextStep, goToStep, resetFlow } = useBoxFlowStore();
  
  const resetPurchaseData = useBlockchainStore(state => state.resetPurchaseData);
  
  const handleTryAgain = () => {
    console.log('🔄 Try Again clicked - Current states:', {
      mysteryBoxStep,
      flowStep: flowState.currentStep,
      error: mysteryBoxError
    });
    
    resetState();
    resetPurchaseData();
    resetFlow();
    initializeFlow(boxType);
    
    console.log('✅ Reset completed');
  };

  const { donationData, purchaseData } = useWhiteBoxStore();
  const { isSuccess: donationSuccess, hash: donationHash, nftReceiptData } = useDonation();
  const { address: userAddress } = useAccount();

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const getBoxType = (title: string): BoxType => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('white')) return 'white';
    if (lowerTitle.includes('blue')) return 'blue';
    if (lowerTitle.includes('silver')) return 'silver';
    return 'blue';
  };
  
  const boxType = getBoxType(title);
  const description = DESCRIPTIONS[boxType] || DESCRIPTIONS.default;

  const whiteBoxTransactionHash = donationData?.transactionHash;
  const { isSuccess: whiteBoxTransactionSuccess } = useWaitForTransactionReceipt({
    hash: whiteBoxTransactionHash as `0x${string}` | undefined,
    query: {
      enabled: !!whiteBoxTransactionHash && boxType === 'white',
    },
  });

  useEffect(() => {
    setShow(true);
    resetState();
    resetFlow();
    initializeFlow(boxType);
  }, [resetState, resetFlow, initializeFlow, boxType]);

  useEffect(() => {
    if (boxType === 'white') {
      if (whiteBoxTransactionHash && flowState.currentStep === 'processing') {
        if (whiteBoxTransactionSuccess) {
          goToNextStep();
        }
      }
      return;
    }
    
    if (mysteryBoxState.step === 'processing' && flowState.currentStep === 'initial') {
      goToNextStep();
    }
    
    if (mysteryBoxState.step === 'finished' && flowState.currentStep === 'processing') {
      goToNextStep();
    }
    
    if (mysteryBoxState.step === 'error' && flowState.currentStep !== 'error') {
      goToStep('error');
    }
  }, [mysteryBoxState.step, mysteryBoxState.transactionHash, flowState.currentStep, boxType, goToNextStep, goToStep, whiteBoxTransactionHash, whiteBoxTransactionSuccess]);

  useEffect(() => {
    if (boxType !== 'white' && mysteryBoxState.step === "finished" && mysteryBoxState.transactionHash && !showReceipt) {
      const timer = setTimeout(() => {
        setShowReceipt(true);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [mysteryBoxState.step, mysteryBoxState.transactionHash, showReceipt, boxType, flowState.currentStep, donationSuccess, donationHash]);

  const handleClose = () => {
    setIsClosing(true);
    setShow(false);
    setTimeout(() => {
      onClose();
      resetState();
      resetFlow();
      setShowReceipt(false);
    }, ANIMATION_DURATION);
  };

  const handleFinishClick = () => {
    if (boxType === 'white') {
      setShowReceipt(true);
      return;
    }
    
    if (mysteryBoxState.step === "finished" && mysteryBoxState.transactionHash) {
      setShowReceipt(true);
    } else {
      setIsClosing(true);
      setShow(false);
      setTimeout(() => {
        onFinish();
        resetState();
        resetFlow();
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
    resetFlow();
    resetPurchaseData();
    initializeFlow(boxType);
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
        return "/assets/ethereum.svg";
    }
  };

  const receiptData = getReceiptData();

  const isProcessing = flowState.currentStep === "processing" || (boxType !== 'white' && mysteryBoxState.step === "processing");
  const isFinished = boxType === 'white' 
    ? flowState.currentStep === "finished"
    : (flowState.currentStep === "finished" || mysteryBoxState.step === "finished");
  const isError = flowState.currentStep === "error" || mysteryBoxState.step === "error";

  console.log('🔍 Modal State Debug:', {
    flowStep: flowState.currentStep,
    mysteryStep: mysteryBoxState.step,
    isError,
    isProcessing,
    isFinished,
    error: mysteryBoxState.error
  });

  const modalClasses = `fixed inset-0 flex items-center justify-center bg-terminal-black/80 z-50 transition-opacity duration-300`;
  const modalContentClasses = `w-[650px] max-w-full font-mono text-terminal-white p-[1px] ${
    isError ? "bg-terminal-red" : "bg-terminal-green"
  } transition-all duration-300 ${
    show ? "opacity-100 scale-100" : "opacity-0 scale-95"
  }`;

  return (
    <>
      {flowState.currentStep === "donation-spin" ? (
        <StepRenderer
          step={flowState.currentStep}
          title={title}
          image={image}
          onClose={handleClose}
          description={description}
          CLIP_PATH={CLIP_PATH}
          customProps={flowState.flowConfig.customSteps?.[flowState.currentStep]?.props}
          onRetry={resetState}
        />
      ) : flowState.currentStep === "donation-select" ? (
        <div className={modalClasses} style={{ opacity: isClosing ? 0 : 1 }}>
          <FrameMysteryBox position="left" />
          <FrameMysteryBox position="right" />
          <div style={{ display: "flex", flexDirection: "row", gap: 4, position: "relative" }}>
            <SidebarModal step="initial" />
            <div
              className={`w-[650px] max-w-full font-mono text-terminal-white p-[1px] bg-terminal-green transition-all duration-300 ${
                show ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{ clipPath: CLIP_PATH }}
              onClick={(e) => e.stopPropagation()}
            >
              <StepRenderer
                step={flowState.currentStep}
                title={title}
                image={image}
                onClose={handleClose}
                description={description}
                CLIP_PATH={CLIP_PATH}
                customProps={flowState.flowConfig.customSteps?.[flowState.currentStep]?.props}
                onRetry={resetState}
              />
            </div>
          </div>
        </div>
      ) : flowState.currentStep === "donation-confirm" ? (
        <div className={modalClasses} style={{ opacity: isClosing ? 0 : 1 }}>
          <FrameMysteryBox position="left" />
          <FrameMysteryBox position="right" />
          <div style={{ display: "flex", flexDirection: "row", gap: 4, position: "relative" }}>
            <SidebarModal step="initial" />
            <div
              className={`w-[650px] max-w-full font-mono text-terminal-white p-[1px] bg-terminal-green transition-all duration-300 ${
                show ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{ clipPath: CLIP_PATH }}
              onClick={(e) => e.stopPropagation()}
            >
              <StepRenderer
                step={flowState.currentStep}
                title={title}
                image={image}
                onClose={handleClose}
                description={description}
                CLIP_PATH={CLIP_PATH}
                customProps={flowState.flowConfig.customSteps?.[flowState.currentStep]?.props}
                onRetry={resetState}
              />
            </div>
          </div>
        </div>
      ) : (
        <>
          {!showReceipt && (
            <div className={modalClasses} style={{ opacity: isClosing ? 0 : 1 }}>
              <FrameMysteryBox
                position="left"
                orange={isProcessing}
                red={isError}
              />
              <FrameMysteryBox
                position="right"
                orange={isProcessing}
                red={isError}
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
                    backgroundColor: isError ? "#9C001D" : isProcessing ? "#FD9C26" : "",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <StepRenderer
                    step={flowState.currentStep}
                    title={title}
                    image={image}
                    onClose={handleClose}
                    description={description}
                    CLIP_PATH={CLIP_PATH}
                    customProps={flowState.flowConfig.customSteps?.[flowState.currentStep]?.props}
                    onRetry={handleTryAgain}
                  />
                </div>
                {isProcessing && !isError && <AnimatedButton />}
                {isError && <ErrorButton onClick={handleTryAgain} />}
                {isFinished && (
                  <FinishButton onClick={handleFinishClick} />
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showReceipt && boxType === 'white' && (donationData || purchaseData) && (
        <DonationReceiptModal
          boxImage={image}
          donationId={donationData?.donationId || 1}
          tokenIcon={getTokenIcon(purchaseData?.selectedTokens?.[0] || 'USDC')}
          tokenSymbol={purchaseData?.selectedTokens?.[0] || 'USDC'}
          donationAmount={purchaseData?.purchaseAmounts?.[0] || '0'}
          transactionHash={whiteBoxTransactionHash}
          nftReceiptData={nftReceiptData}
          senderAddress={userAddress}
          onClose={handleReceiptClose}
          onNewDonation={() => {
            setShowReceipt(false);
          }}
          isSpinning={false}
        >
          <FrameReceiptModal position="left" />
          <FrameReceiptModal position="right" />
        </DonationReceiptModal>
      )}
      
      {showReceipt && boxType !== 'white' && (
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

export default EnhancedMysteryBoxModal;
