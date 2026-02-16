import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useBoxFlowStore, useWhiteBoxStore, useUIStore } from "@/stores";
import { useDonation } from "@/hooks/useDonation";
import DonationSpin from "../../donationSpin/DonationSpin";
import { DONATION_WALLETS, DonationId } from "@/constants/donations";

interface DonationSpinStepProps {
  title: string;
  image: string;
  onClose: () => void;
  CLIP_PATH: string;
}

const DonationSpinStep: React.FC<DonationSpinStepProps> = ({
  title,
  onClose,
  CLIP_PATH,
}) => {
  const [showDonationSpin, setShowDonationSpin] = useState(true);
  const [selectedDonationId, setSelectedDonationId] = useState<DonationId | null>(null);
  const [isDonationComplete, setIsDonationComplete] = useState(false);
  
  const { goToNextStep } = useBoxFlowStore();
  const { purchaseData, donationData, setDonationData } = useWhiteBoxStore();
  const { donate, getRandomDonationId, isLoading, error, hash } = useDonation();
  const { showToast } = useUIStore();

  useEffect(() => {
    if (!purchaseData) {
      showToast("Missing purchase data. Please restart the process.", "error");
      onClose();
    }
  }, [purchaseData, showToast, onClose]);

  const handleDonationSelect = () => {
    const randomId = getRandomDonationId();
    setSelectedDonationId(randomId);
    setShowDonationSpin(false);
    proceedWithDonation(randomId);
  };

  const handleDonationSpin = (selectedId?: number) => {
    
    let donationId: DonationId;
    if (selectedId && selectedId >= 1 && selectedId <= 6) {
      donationId = selectedId as DonationId;
    } else {
      donationId = getRandomDonationId();
    }
    
    setSelectedDonationId(donationId);
    
    showToast(`Selected: Donation ID ${donationId} - ${DONATION_WALLETS[donationId].slice(0, 6)}...${DONATION_WALLETS[donationId].slice(-4)}`, "success");
    
    setShowDonationSpin(false);
    
    setTimeout(() => {
      proceedWithDonation(donationId);
    }, 2000);
  };

  const proceedWithDonation = async (donationId: DonationId) => {
    try {
      if (!purchaseData) {
        throw new Error("Purchase data is missing. Please restart the process.");
      }
      
      const donationDataToSet = {
        donationId,
        recipientWallet: DONATION_WALLETS[donationId],
        isSpinComplete: true,
        selectionMethod: 'random' as const,
      };
      
      setDonationData(donationDataToSet);
      
      const combinedData = createCombinedData(purchaseData, donationDataToSet);
      
      
      await donate(combinedData);
      
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Donation failed", "error");
    }
  };

  const createCombinedData = (purchaseData: any, donationData: any) => {
    const totalValueETH = purchaseData.selectedTokens
      .map((token: string, index: number) => {
        if (token !== "None" && 
            purchaseData.purchaseAmounts[index] && 
            parseFloat(purchaseData.purchaseAmounts[index]) > 0) {
          return parseFloat(purchaseData.purchaseAmounts[index]);
        }
        return 0;
      })
      .reduce((total: number, amount: number) => total + amount, 0)
      .toString();

    return {
      donationId: donationData.donationId,
      amountETH: totalValueETH
    };
  };

  useEffect(() => {
    if (hash && !isDonationComplete) {
      showToast("Transaction sent! Processing donation...", "info");
      setIsDonationComplete(true);
      
        setTimeout(() => {
        goToNextStep(); 
      }, 1500);
    }
  }, [hash, isDonationComplete, goToNextStep, showToast]);

  useEffect(() => {
    if (hash && donationData && !donationData.transactionHash) {
      setDonationData({
        ...donationData,
        transactionHash: hash
      });
    }
  }, [hash, donationData, setDonationData]);

  useEffect(() => {
    if (error) {
      showToast("Donation failed: " + error.message, "error");
    }
  }, [error, showToast]);

  const handleDonationClose = () => {
    setShowDonationSpin(false);
    onClose();
  };

  if (!purchaseData) {
    return (
      <div
        className="bg-terminal-black text-terminal-red font-mono rounded-lg p-0 relative"
        style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
      >
        <div className="relative h-10 border-b border-terminal-red flex items-center justify-between px-6">
          <span className="text-terminal-red font-bold text-sm uppercase">
            ERROR - Missing Purchase Data
          </span>
          <button onClick={onClose} className="flex items-center gap-2 group">
            <span className="text-terminal-gray-light font-bold text-sm group-hover:underline">
              EXIT
            </span>
            <X size={16} className="text-terminal-gray-light transition-colors hover:text-terminal-red" />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center h-full px-8 py-6">
          <div className="text-center">
            <h3 className="text-terminal-red text-xl font-bold mb-2">
              Purchase Data Missing
            </h3>
            <p className="text-terminal-gray-light text-sm">
              Please restart the White Box process
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showDonationSpin) {
    return (
      <DonationSpin
        isOpen={showDonationSpin}
        onClose={handleDonationClose}
        onSpin={handleDonationSpin}
      />
    );
  }

  return (
    <>
      {!isDonationComplete && (
        <div
          className="bg-terminal-black text-terminal-green font-mono rounded-lg p-0 relative"
          style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
        >
          <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
            <span className="text-terminal-green font-bold text-sm uppercase">
              {title} - Processing Donation
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
          
          <div className="flex flex-col items-center justify-center h-full px-8 py-6">
            <div className="text-center mb-6">
              <h3 className="text-white text-xl font-bold mb-2">
                {isLoading ? "Processing Donation..." : "Donation Selected"}
              </h3>
              {selectedDonationId && (
                <div className="text-terminal-green text-sm mb-4">
                  <p>Donation ID: {selectedDonationId}</p>
                  <p>Recipient: {DONATION_WALLETS[selectedDonationId].slice(0, 10)}...{DONATION_WALLETS[selectedDonationId].slice(-8)}</p>
                </div>
              )}
              <p className="text-terminal-gray-light text-sm">
                {isLoading 
                  ? "Executing donation transaction..." 
                  : "Donation organization selected. Processing..."}
              </p>
            </div>
            
            <div className="text-terminal-green text-sm">
              {isLoading ? "→ Sending transaction..." : "→ Preparing donation..."}
            </div>
          </div>
        </div>
      )}

      {isDonationComplete && (
        <div
          className="bg-terminal-black text-terminal-green font-mono rounded-lg p-0 relative"
          style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
        >
          <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
            <span className="text-terminal-green font-bold text-sm uppercase">
              {title} - Donation Complete
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
          
          <div className="flex flex-col items-center justify-center h-full px-8 py-6">
            <div className="text-center mb-6">
              <h3 className="text-terminal-green text-xl font-bold mb-2">
                ✅ Donation Successful!
              </h3>
              {selectedDonationId && (
                <div className="text-terminal-green text-sm mb-4">
                  <p>Thank you for your contribution!</p>
                  <p>Donation ID: {selectedDonationId}</p>
                  <p>Recipient: {DONATION_WALLETS[selectedDonationId].slice(0, 10)}...{DONATION_WALLETS[selectedDonationId].slice(-8)}</p>
                </div>
              )}
              <p className="text-terminal-gray-light text-sm">
                Your donation has been processed successfully. Proceeding with your Phreaking box...
              </p>
            </div>
            
            <div className="text-terminal-green text-sm">
              → Finalizing your Phreaking box experience...
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DonationSpinStep;
