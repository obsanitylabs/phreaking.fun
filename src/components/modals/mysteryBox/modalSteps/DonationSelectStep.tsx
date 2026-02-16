import React, { useState } from "react";
import { X, ChevronDown, Shuffle } from "lucide-react";
import Image from "next/image";
import { useBoxFlowStore, useWhiteBoxStore, useUIStore } from "@/stores";
import { DONATION_WALLETS, DONATION_ORGANIZATIONS, DonationId } from "@/constants/donations";
import DonationSpin from "../../donationSpin/DonationSpin";
import Button from "@/components/ui/button";

interface DonationSelectStepProps {
  title: string;
  image: string;
  onClose: () => void;
  CLIP_PATH: string;
}

const DonationSelectStep: React.FC<DonationSelectStepProps> = ({
  title,
  onClose,
  CLIP_PATH,
}) => {
  const [selectedId, setSelectedId] = useState<DonationId | "random" | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showWheelOverlay, setShowWheelOverlay] = useState(false);

  const { goToNextStep } = useBoxFlowStore();
  const { setDonationData, purchaseData } = useWhiteBoxStore();
  const { showToast } = useUIStore();

  const donationIds = Object.keys(DONATION_ORGANIZATIONS).map(Number) as DonationId[];

  const handleDropdownSelect = (id: DonationId | "random") => {
    setSelectedId(id);
    setIsDropdownOpen(false);
  };

  const handleConfirm = () => {
    if (!purchaseData) {
      showToast("Missing purchase data. Please restart the process.", "error");
      return;
    }

    if (selectedId === "random") {
      setShowWheelOverlay(true);
      return;
    }

    if (selectedId === null) {
      showToast("Please select a donation recipient.", "error");
      return;
    }

    // Direct selection — set donation data and proceed to confirm step
    setDonationData({
      donationId: selectedId,
      recipientWallet: DONATION_WALLETS[selectedId],
      isSpinComplete: true,
      selectionMethod: 'dropdown',
    });

    goToNextStep();
  };

  const handleWheelResult = (resultId?: number) => {
    if (!purchaseData) {
      showToast("Missing purchase data. Please restart the process.", "error");
      return;
    }

    const donationId = (resultId && resultId >= 1 && resultId <= 6
      ? resultId
      : Math.floor(Math.random() * 6) + 1) as DonationId;

    setDonationData({
      donationId,
      recipientWallet: DONATION_WALLETS[donationId],
      isSpinComplete: true,
      selectionMethod: 'random',
    });

    setShowWheelOverlay(false);

    showToast(
      `Selected: ${DONATION_ORGANIZATIONS[donationId].name}`,
      "success"
    );

    // Short delay so the user can see the toast before transitioning
    setTimeout(() => {
      goToNextStep();
    }, 800);
  };

  const handleWheelClose = () => {
    setShowWheelOverlay(false);
    setSelectedId(null);
  };

  // If the wheel overlay is active, render it full-screen
  if (showWheelOverlay) {
    return (
      <DonationSpin
        isOpen={true}
        onClose={handleWheelClose}
        onSpin={handleWheelResult}
      />
    );
  }

  const selectedOrg = selectedId && selectedId !== "random"
    ? DONATION_ORGANIZATIONS[selectedId]
    : null;

  return (
    <div
      className="bg-terminal-black text-terminal-green font-mono rounded-lg p-0 relative"
      style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
    >
      {/* Header bar */}
      <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
        <span className="text-terminal-green font-bold text-sm uppercase tracking-wider">
          {title} &mdash; Select Recipient
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

      <div className="flex flex-col items-center px-8 pt-6 pb-4 h-[calc(100%-40px)]">
        {/* Instruction */}
        <p className="text-terminal-gray-light text-sm mb-5 text-center">
          Choose an organization to donate to, or select <span className="text-terminal-green font-bold">Random</span> to spin the wheel.
        </p>

        {/* Dropdown */}
        <div className="w-full max-w-[420px] relative mb-5">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-full flex items-center justify-between px-4 py-3 border rounded transition-colors ${
              isDropdownOpen
                ? "border-terminal-green bg-terminal-green/10"
                : "border-terminal-green/40 bg-terminal-black hover:border-terminal-green/70"
            }`}
          >
            <span className={`text-sm ${selectedId ? "text-white" : "text-terminal-gray-light"}`}>
              {selectedId === "random"
                ? "Random (Spin the Wheel)"
                : selectedOrg
                ? selectedOrg.name
                : "Select a recipient..."}
            </span>
            <ChevronDown
              size={16}
              className={`text-terminal-green transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 border border-terminal-green/40 rounded bg-terminal-black z-50 max-h-[200px] overflow-y-auto">
              {/* Random option */}
              <button
                onClick={() => handleDropdownSelect("random")}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-terminal-green/10 border-b border-terminal-green/20 ${
                  selectedId === "random" ? "bg-terminal-green/15" : ""
                }`}
              >
                <Shuffle size={18} className="text-terminal-green flex-shrink-0" />
                <div>
                  <span className="text-terminal-green font-bold text-sm">Random</span>
                  <span className="text-terminal-gray-light text-xs ml-2">Spin the Wheel</span>
                </div>
              </button>

              {/* Foundation options */}
              {donationIds.map((id) => {
                const org = DONATION_ORGANIZATIONS[id];
                return (
                  <button
                    key={id}
                    onClick={() => handleDropdownSelect(id)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-terminal-green/10 ${
                      selectedId === id ? "bg-terminal-green/15" : ""
                    } ${id < 6 ? "border-b border-terminal-green/10" : ""}`}
                  >
                    <div className="w-6 h-6 flex-shrink-0 relative">
                      <Image
                        src={org.icon}
                        alt={org.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm block truncate">{org.name}</span>
                      <span className="text-terminal-gray-light text-xs block truncate">
                        {org.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected org preview card */}
        {selectedOrg && (
          <div className="w-full max-w-[420px] border border-terminal-green/30 rounded p-4 mb-5 bg-terminal-green/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 relative flex-shrink-0">
                <Image
                  src={selectedOrg.icon}
                  alt={selectedOrg.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-sm">{selectedOrg.name}</h4>
                <p className="text-terminal-gray-light text-xs">{selectedOrg.description}</p>
                <p className="text-terminal-green-dark text-xs mt-1">
                  {selectedOrg.category} &bull; {selectedOrg.location}
                </p>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-terminal-green/20">
              <p className="text-terminal-green-dark text-xs font-mono">
                Wallet: {DONATION_WALLETS[selectedId as DonationId].slice(0, 10)}...
                {DONATION_WALLETS[selectedId as DonationId].slice(-6)}
              </p>
            </div>
          </div>
        )}

        {selectedId === "random" && (
          <div className="w-full max-w-[420px] border border-terminal-green/30 rounded p-4 mb-5 bg-terminal-green/5 text-center">
            <Shuffle size={24} className="text-terminal-green mx-auto mb-2" />
            <p className="text-white text-sm font-bold">Feeling lucky?</p>
            <p className="text-terminal-gray-light text-xs mt-1">
              Click confirm to spin the wheel and let fate decide your recipient.
            </p>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Confirm button */}
        <div className="w-full max-w-[420px]">
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={selectedId === null}
            className="w-full text-center"
            value={
              selectedId === "random"
                ? "[Spin the Wheel]"
                : selectedId
                ? "[Confirm Selection]"
                : "[Select a Recipient]"
            }
            text="center"
          />
        </div>
      </div>
    </div>
  );
};

export default DonationSelectStep;
