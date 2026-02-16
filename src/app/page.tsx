"use client";
import React, { useState, useEffect } from "react";
import Header from "@/components/header/header";
import SidebarStatusPanel from "@/components/sidebarStatusPanel/sidebarStatusPanel";
import AdminData from "@/components/adminData/adminData";
import { ProgressBar } from "@/components/ui/progressBar";
import SignalCard from "@/components/common/SignalCard";
import GlobeCard from "@/components/common/GlobeCard";
import MysteryBoxCard from "@/components/common/MysteryBoxCard";
import EnhancedMysteryBoxModal from "@/components/modals/mysteryBox/EnhancedMysteryBoxModal";
import ReceiptModal from "@/components/modals/receiptModal/ReceiptModal";
import FrameReceiptModal from "@/components/modals/receiptModal/FrameReceiptModal";
import ToastContainer from "@/components/ui/ToastContainer";
import { TutorialOverlay } from "@/components/ui/TutorialOverlay";
import { 
  useMysteryBoxStore, 
  useUIStore, 
  useBlockchainStore,
  selectMysteryBoxStep, 
  selectReceiptModal,
  selectMysteryBoxRewards,
  selectMysteryBoxTransactionHash
} from "@/stores";
import { formatEther } from "viem";

export default function Home() {
  const boxRows = [
    {
      label: "Refresh Toolkit",
      boxes: [
        {
          title: "Red Box",
          image: "/boxes/redBox.svg",
          available: false,
          description:
            "Users deposit 1 whole token, and receive 1 whole token in return. 1 AVAX could return 1 BAX or 1 WBTC. Toggle between native chain or cross-chain for more options.",
          type: "1:1 Token Swap",
        },
        {
          title: "Blue Box",
          image: "/boxes/blueBox.svg",
          available: true,
          description:
            "Users deposit a portfolio of tokens and receive a curated portfolio of equivalent value. This is not a stablecoin swap but a broader portfolio swap designed for minimal slippage.",
          type: "Portfolio Swap",
        },
        {
          title: "Green Box",
          image: "/boxes/greenBox.svg",
          available: false,
          description:
            "Deposit old shitcoins that never amounted to anything, get newer shitcoins in return that meet certain criteria — less than two years old with at least 100k average daily volume.",
          type: "Token Recycling",
        },
      ],
    },
    {
      label: "Adrenaline Toolkit",
      boxes: [
        {
          title: "White Box",
          image: "/boxes/whiteBox.svg",
          available: true,
          description:
            "Donate your crypto to a charitable organization. Select from a list of foundations or spin the wheel and let fate decide. An NFT receipt is generated as proof of donation.",
          type: "Donate",
        },
        {
          title: "Black Box",
          image: "/boxes/blackBox.svg",
          available: false,
          description:
            "Rage quit. Throw your entire wallet into a black hole and zero out your balances. Receive a minted Hide The Pain Harold NFT displaying the dollar value sent.",
          type: "Rage Quit",
        },
      ],
    },
    {
      label: "Vibe Toolkit",
      boxes: [
        {
          title: "Silver Box",
          image: "/boxes/silverBox.svg",
          available: true,
          description:
            "Swap tokens and receive only top coins held in hedge fund and VC portfolios. A good way to piggyback off the gambles of smart money.",
          type: "Copy Trade — Majors",
        },
        {
          title: "Gold Box",
          image: "/boxes/goldBox.svg",
          available: false,
          description:
            "Like the Silver mirror, but only for coins under $30M market cap. Whitelisted tokens taken from public portfolios of top-tier venture funds.",
          type: "Copy Trade — Microcaps",
        },
        {
          title: "Diamond Box",
          image: "/boxes/diamondBox.svg",
          available: false,
          description:
            "Dollar-for-dollar trade for coins with under a $10M market cap. Must have at least $10k daily volume and be less than 3 years old. 1000x or death.",
          type: "Copy Trade — Highest Risk",
        },
      ],
    },
  ];

  // Flat list for state lookups
  const allBoxes = boxRows.flatMap((row) => row.boxes);

  const [selectedBox, setSelectedBox] = useState<null | (typeof allBoxes)[0]>(
    null,
  );
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptBox, setReceiptBox] = useState<null | (typeof allBoxes)[0]>(null);
  const [hoveredBox, setHoveredBox] = useState<null | {
    title: string;
    description: string;
    type: string;
  }>(null);

  const mysteryBoxState = useMysteryBoxStore(selectMysteryBoxStep);
  const mysteryBoxRewards = useMysteryBoxStore(selectMysteryBoxRewards);
  const mysteryBoxTransactionHash = useMysteryBoxStore(selectMysteryBoxTransactionHash);
  const isConfirmed = useMysteryBoxStore(state => state.isConfirmed);
  const receipt = useMysteryBoxStore(state => state.receipt);
  const resetMysteryBoxState = useMysteryBoxStore(state => state.resetState);
  
  const receiptModal = useUIStore(selectReceiptModal);
  const resetPurchaseData = useBlockchainStore(state => state.resetPurchaseData);

  useEffect(() => {
    if (
      isConfirmed &&
      mysteryBoxState === "finished" &&
      !showReceipt &&
      selectedBox &&
      mysteryBoxTransactionHash
    ) {
      setReceiptBox(selectedBox);
      setSelectedBox(null);
      setShowReceipt(true);
    }
  }, [isConfirmed, mysteryBoxState, showReceipt, selectedBox, mysteryBoxTransactionHash]);

  const getTransactionData = () => {
    if (mysteryBoxRewards && mysteryBoxRewards.length > 0) {
      const firstReward = mysteryBoxRewards[0];
      return {
        coinName: firstReward.tokenSymbol,
        amount: firstReward.formattedValue,
        coinIcon: getTokenIcon(firstReward.tokenSymbol),
        ethValue: formatEther(BigInt((receipt as any)?.value || 0)),
      };
    }

    const ethValue = (receipt as any)?.value
      ? formatEther(BigInt((receipt as any).value))
      : "0";

    return {
      coinName: "ETH",
      amount: ethValue,
      coinIcon: "/assets/ethereum.svg",
      ethValue: ethValue,
    };
  };

  const getTokenIcon = (tokenSymbol: string) => {
    switch (tokenSymbol.toUpperCase()) {
      case "ETH":
      case "WETH":
        return "/assets/ethereum.svg";
      case "USDC":
        return "/tokens/usdc.png";
      case "LINK":
        return "/assets/chainlink.svg";
      case "USDT":
        return "/tokens/usdt.svg";
      default:
        return "/tokens/usdt.svg";
    }
  };

  const handleBoxFinish = (box: (typeof allBoxes)[0]) => {
    setReceiptBox(box);
    setSelectedBox(null);
    setShowReceipt(true);
  };

  const handleRestake = () => {
    setShowReceipt(false);
    setReceiptBox(null);
    if (receiptBox) {
      setSelectedBox(receiptBox);
    }
    resetPurchaseData();
    resetMysteryBoxState();
  };

  const transactionData = getTransactionData();

  return (
    <>
      <ToastContainer />
      <div className="flex flex-col min-h-screen bg-terminal-black text-terminal-green font-mono">
        <Header />

        <div className="flex items-center gap-2 px-8 pt-4 mb-2 w-full">
          <div className="flex items-center gap-2">
            <span className="text-xs text-terminal-green-dark">HOME</span>
            <span className="text-terminal-green">{">"}</span>
            <span className="text-xs text-terminal-green">PHREAKING FUN</span>
          </div>
          <div className="flex-1 flex items-center ml-12">
            <ProgressBar animationType="leftToRight" />
          </div>
        </div>

        <div className="flex flex-1 h-full">
          <div className="w-[20%] min-w-[200px] shrink-0 h-full">
            <SidebarStatusPanel
              hoveredBoxName={hoveredBox?.title}
              hoveredBoxDescription={hoveredBox?.description}
              hoveredBoxType={hoveredBox?.type}
            />
          </div>

          <div className="flex-1 px-8">
            <div className="max-w-[1500px] mx-auto">
              <div className="flex justify-between gap-x-4">
                <div className="basis-1/3">
                  <AdminData />
                </div>
                <div className="basis-1/3">
                  <SignalCard image="/signal.gif" title="SIGNAL STABILITY" />
                </div>
                <div className="basis-1/3">
                  <GlobeCard
                    image1="/globe.gif"
                    image2="/graphic.svg"
                    title="GLOBAL STABILITY"
                  />
                </div>
              </div>
            </div>

            <div className="relative mt-8 w-full px-8">
              <div
                className="absolute inset-0 bg-terminal-green mx-8"
                style={{
                  clipPath: "var(--clip-path-card)",
                  transform: "scale(1.001)",
                }}
              />
              <div
                className="relative w-full border border-terminal-green bg-terminal-black"
                style={{ clipPath: "var(--clip-path-card)" }}
              >
                <div className="border-b border-terminal-green px-4 py-0.5 rounded-t-md">
                  <span className="text-terminal-green font-bold text-base tracking-widest font-mono">
                    Phreaking Tools
                  </span>
                </div>
                <div className="space-y-0" data-testid="mystery-box-grid">
                  {boxRows.map((row, rowIndex) => (
                    <div
                      key={row.label}
                      className={`border-b border-terminal-green/30 last:border-b-0 ${rowIndex > 0 ? "border-t border-terminal-green/30" : ""}`}
                    >
                      <div className="px-4 py-1.5 border-b border-terminal-green/20 bg-terminal-green/5">
                        <span className="text-terminal-green-dark text-xs font-bold tracking-widest uppercase">
                          {row.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-8 p-6">
                        {row.boxes.map((box) => (
                          <MysteryBoxCard
                            key={box.title}
                            title={box.title}
                            image={box.image}
                            available={box.available}
                            description={box.description}
                            type={box.type}
                            onClick={() => box.available && setSelectedBox(box)}
                            onMouseEnter={() =>
                              setHoveredBox({
                                title: box.title,
                                description: box.description,
                                type: box.type,
                              })
                            }
                            onMouseLeave={() => setHoveredBox(null)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedBox && (
        <EnhancedMysteryBoxModal
          title={selectedBox.title}
          image={selectedBox.image}
          onClose={() => setSelectedBox(null)}
          onFinish={() => handleBoxFinish(selectedBox)}
        />
      )}

      {showReceipt && receiptBox && transactionData && (
        <ReceiptModal
          boxImage={receiptBox.image}
          coinIcon={transactionData.coinIcon}
          coinName={transactionData.coinName}
          amount={transactionData.amount}
          onClose={() => {
            setShowReceipt(false);
            setReceiptBox(null);
            resetMysteryBoxState();
            resetPurchaseData();
          }}
          onRestake={handleRestake}
        >
          <FrameReceiptModal position="left" />
          <FrameReceiptModal position="right" />
        </ReceiptModal>
      )}

      <TutorialOverlay />
      
  {/* ...existing code... */}
    </>
  );
}
