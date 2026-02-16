import React, { useState, useEffect } from "react";
import { useDonation } from "@/hooks/useDonation";
import { useWhiteBoxStore } from "@/stores";
import DonationReceiptModal from "@/components/modals/receiptModal/DonationReceiptModal";
import FrameReceiptModal from "@/components/modals/receiptModal/FrameReceiptModal";
import { DonationId } from "@/constants/donations";

interface WhiteBoxDonationFlowProps {
  onClose: () => void;
  onNewDonation?: () => void;
}

const WhiteBoxDonationFlow: React.FC<WhiteBoxDonationFlowProps> = ({
  onClose,
  onNewDonation
}) => {
  const [showReceipt, setShowReceipt] = useState(false);
  const [completedDonation, setCompletedDonation] = useState<{
    donationId: DonationId;
    tokenSymbol: string;
    tokenIcon: string;
    amount: string;
    transactionHash?: string;
  } | null>(null);

  const { isSuccess, hash } = useDonation();
  const { donationData, purchaseData } = useWhiteBoxStore();

  useEffect(() => {
    if (isSuccess && hash && donationData && purchaseData) {
      
      const firstTokenAmount = purchaseData.purchaseAmounts[0] || "0";
      const firstTokenCode = purchaseData.selectedTokens[0] || "USDC";
      
      setCompletedDonation({
        donationId: donationData.donationId,
        tokenSymbol: firstTokenCode,
        tokenIcon: getTokenIcon(firstTokenCode),
        amount: firstTokenAmount,
        transactionHash: hash
      });
      
      setShowReceipt(true);
    }
  }, [isSuccess, hash, donationData, purchaseData]);

  const getTokenIcon = (tokenCode: string): string => {
    switch (tokenCode.toUpperCase()) {
      case "USDC":
        return "/tokens/usdt.svg"; 
      case "ETH":
        return "/assets/ethereum.svg";
      case "LINK":
        return "/assets/chainlink.svg";
      default:
        return "/tokens/usdt.svg";
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setCompletedDonation(null);
    onClose();
  };

  const handleNewDonation = () => {
    setShowReceipt(false);
    setCompletedDonation(null);
    if (onNewDonation) {
      onNewDonation();
    }
  };

  if (!showReceipt || !completedDonation) {
    return null;
  }

  return (
    <DonationReceiptModal
      boxImage="/boxes/whiteBox.svg"
      donationId={completedDonation.donationId}
      tokenIcon={completedDonation.tokenIcon}
      tokenSymbol={completedDonation.tokenSymbol}
      donationAmount={completedDonation.amount}
      transactionHash={completedDonation.transactionHash}
      onClose={handleCloseReceipt}
      onNewDonation={handleNewDonation}
      isSpinning={false}
    > 
      <FrameReceiptModal position="left" />
      <FrameReceiptModal position="right" />
    </DonationReceiptModal>
  );
};

export default WhiteBoxDonationFlow;
