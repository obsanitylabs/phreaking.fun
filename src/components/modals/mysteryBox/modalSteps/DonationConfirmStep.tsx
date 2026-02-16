import React, { useState, useEffect } from "react";
import { X, ArrowRight, Shield } from "lucide-react";
import Image from "next/image";
import { useBoxFlowStore, useWhiteBoxStore, useUIStore } from "@/stores";
import { DONATION_WALLETS, DONATION_ORGANIZATIONS, DonationId } from "@/constants/donations";
import { useDonation } from "@/hooks/useDonation";
import SliderButton from "@/components/ui/SliderButton";

interface DonationConfirmStepProps {
  title: string;
  image: string;
  onClose: () => void;
  CLIP_PATH: string;
}

const DonationConfirmStep: React.FC<DonationConfirmStepProps> = ({
  title,
  onClose,
  CLIP_PATH,
}) => {
  const [isSliderSwiped, setIsSliderSwiped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDonationComplete, setIsDonationComplete] = useState(false);

  const { goToNextStep, goToStep } = useBoxFlowStore();
  const { purchaseData, donationData, setDonationData } = useWhiteBoxStore();
  const { donate, isLoading, error, hash, nftReceiptData } = useDonation();
  const { showToast } = useUIStore();

  const donationId = donationData?.donationId;
  const organization = donationId ? DONATION_ORGANIZATIONS[donationId] : null;
  const recipientWallet = donationId ? DONATION_WALLETS[donationId] : "";

  // Calculate total value from purchaseData
  const totalValue = purchaseData
    ? purchaseData.purchaseAmounts
        .reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0)
        .toFixed(6)
    : "0";

  const tokenSummary = purchaseData
    ? purchaseData.selectedTokens
        .map((token, i) => `${purchaseData.purchaseAmounts[i]} ${token}`)
        .join(", ")
    : "";

  // Watch for tx hash to advance flow
  useEffect(() => {
    if (hash && !isDonationComplete) {
      setIsDonationComplete(true);

      // Store the tx hash in donationData
      if (donationData) {
        setDonationData({
          ...donationData,
          transactionHash: hash,
        });
      }

      showToast("Donation submitted! Waiting for confirmation...", "info");

      // Advance to processing step
      goToNextStep();
    }
  }, [hash, isDonationComplete, donationData, setDonationData, goToNextStep, showToast]);

  // Watch for errors
  useEffect(() => {
    if (error) {
      const msg = error.message.includes("User rejected")
        ? "Transaction cancelled by user"
        : error.message;
      showToast("Donation failed: " + msg, "error");
      setIsSubmitting(false);
      setIsSliderSwiped(false);
    }
  }, [error, showToast]);

  const handleConfirmSwipe = async () => {
    if (isSubmitting || !donationData || !purchaseData) return;

    try {
      setIsSubmitting(true);

      const totalValueETH = purchaseData.purchaseAmounts
        .reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0)
        .toString();

      await donate({
        donationId: donationData.donationId,
        amountETH: totalValueETH,
        tokenAddresses: purchaseData.tokens,
        tokenAmounts: purchaseData.purchaseAmounts,
        tokenCodes: purchaseData.selectedTokens,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      showToast(errorMessage, "error");
      setIsSubmitting(false);
      setIsSliderSwiped(false);
    }
  };

  if (!donationData || !purchaseData || !organization) {
    return (
      <div
        className="bg-terminal-black text-terminal-red font-mono rounded-lg p-0 relative"
        style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
      >
        <div className="relative h-10 border-b border-terminal-red flex items-center justify-between px-6">
          <span className="text-terminal-red font-bold text-sm uppercase">
            ERROR - Missing Data
          </span>
          <button onClick={onClose} className="flex items-center gap-2 group">
            <span className="text-terminal-gray-light font-bold text-sm group-hover:underline">
              EXIT
            </span>
            <X size={16} className="text-terminal-gray-light transition-colors hover:text-terminal-red" />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center h-full px-8 py-6">
          <h3 className="text-terminal-red text-xl font-bold mb-2">Missing Data</h3>
          <p className="text-terminal-gray-light text-sm">
            Please restart the White Box process.
          </p>
        </div>
      </div>
    );
  }

  const formatWallet = (addr: string) => `${addr.slice(0, 8)}...${addr.slice(-6)}`;

  return (
    <div
      className="bg-terminal-black text-terminal-green font-mono rounded-lg p-0 relative"
      style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
    >
      {/* Header bar */}
      <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
        <span className="text-terminal-green font-bold text-sm uppercase tracking-wider">
          {title} &mdash; Confirm Donation
        </span>
        <button onClick={onClose} className="flex items-center gap-2 group">
          <span className="text-terminal-gray-light font-bold text-sm group-hover:underline">
            EXIT
          </span>
          <X
            size={16}
            className="text-terminal-gray-light transition-colors hover:text-terminal-green-light"
          />
        </button>
      </div>

      <div className="flex flex-col px-8 pt-5 pb-4 h-[calc(100%-40px)]">
        {/* Recipient card */}
        <div className="flex items-center gap-4 p-3 border border-terminal-green/30 rounded bg-terminal-green/5 mb-4">
          <div className="w-12 h-12 relative flex-shrink-0">
            <Image
              src={organization.icon}
              alt={organization.name}
              fill
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-bold text-sm">{organization.name}</h4>
            <p className="text-terminal-green-dark text-xs">{organization.category}</p>
            <p className="text-terminal-green-dark text-xs font-mono mt-0.5">
              {formatWallet(recipientWallet)}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs text-terminal-gray-light block">
              {donationData.selectionMethod === 'random' ? 'Wheel Spin' : 'Manual Pick'}
            </span>
          </div>
        </div>

        {/* Transaction details */}
        <div className="border border-terminal-green/20 rounded p-3 mb-4 space-y-2">
          <h3 className="text-terminal-green font-bold text-xs uppercase tracking-wider mb-2">
            Transaction Details
          </h3>

          <div className="flex justify-between text-sm">
            <span className="text-terminal-gray-light">Tokens:</span>
            <span className="text-white text-right max-w-[280px] truncate">{tokenSummary}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-terminal-gray-light">Total Value:</span>
            <span className="text-white font-bold">{totalValue} (raw sum)</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-terminal-gray-light">Recipient:</span>
            <span className="text-white font-mono text-xs">{formatWallet(recipientWallet)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-terminal-gray-light">Network:</span>
            <span className="text-white">Sepolia Testnet</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-terminal-gray-light">Route:</span>
            <span className="text-white flex items-center gap-1">
              Your Wallet <ArrowRight size={12} /> White Box Contract <ArrowRight size={12} /> {organization.name}
            </span>
          </div>
        </div>

        {/* NFT receipt notice */}
        <div className="flex items-center gap-2 px-3 py-2 bg-terminal-green/5 border border-terminal-green/20 rounded mb-4">
          <Shield size={14} className="text-terminal-green flex-shrink-0" />
          <p className="text-terminal-gray-light text-xs">
            An <span className="text-terminal-green font-bold">NFT receipt</span> will be generated as proof of your donation with full transaction details.
          </p>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Slide to confirm */}
        <div className="w-full">
          <SliderButton
            text={isSubmitting ? "SUBMITTING..." : "SLIDE TO CONFIRM DONATION"}
            disabled={isSubmitting || isLoading}
            isSwiped={isSliderSwiped}
            onSwipeChange={setIsSliderSwiped}
            onClick={handleConfirmSwipe}
          />
        </div>
      </div>
    </div>
  );
};

export default DonationConfirmStep;
