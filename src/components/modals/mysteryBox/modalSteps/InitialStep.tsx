import React, { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { X, PlusIcon, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "@/components/ui/button";
import SliderButton from "@/components/ui/SliderButton";
import DonationInput from "@/components/ui/DonationInput";
import { useBlockchain } from "@/hooks/useBlockchain";
import { useMysteryBoxStore, useWhiteBoxStore, useBoxFlowStore, useUIStore } from "@/stores";
import { currencies, getBoxId } from "@/constants/currencies";
import { useAccount } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";

interface InitialStepProps {
  title: string;
  image: string;
  onClose: () => void;
  description: string;
  CLIP_PATH: string;
}

const InitialStep: React.FC<InitialStepProps> = ({
  title,
  image,
  onClose,
  description,
  CLIP_PATH,
}) => {
  const { showToast } = useUIStore();
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  
  const { purchaseBox, setTransactionHash, finishProcessing, errorProcessing } = useMysteryBoxStore();
  const { setPurchaseData } = useWhiteBoxStore();
  const { goToNextStep } = useBoxFlowStore();

  const {
    balances,
    balancesInitialized,
    purchaseAmounts,
    setPurchaseAmounts,
    selectedTokens,
    setSelectedTokens,
    isPending,
    isConfirming,
    error,
    resetPurchaseData,
    buyMysteryBox,
  } = useBlockchain();

  const [isSliderSwiped, setIsSliderSwiped] = useState(false);
  const [currentTokenIndex, setCurrentTokenIndex] = useState(0);
  const [isTokenDropdownOpen, setIsTokenDropdownOpen] = useState(false);

  const hasInitialized = useRef(false);

  const isWhiteBox = title.toLowerCase().includes('white');

  useEffect(() => {
    if (!hasInitialized.current) {
      resetPurchaseData();
      setCurrentTokenIndex(0);
      setIsTokenDropdownOpen(false);
      setIsSliderSwiped(false);
      hasInitialized.current = true;
    }
        
  }, []);

  useEffect(() => {
    return () => {
      hasInitialized.current = false;
    };
  }, []);

  useEffect(() => {
    if (purchaseAmounts.length === 0) {
      setPurchaseAmounts([""]);
    }
    
    if (isWhiteBox) {
      if (selectedTokens.length === 0 || selectedTokens[0] !== "ETH") {
        setSelectedTokens(["ETH"]);
      }
    } else {
      if (selectedTokens.length === 0) {
        setSelectedTokens(["None"]);
      }
    }
  }, [
    purchaseAmounts.length,
    selectedTokens.length,
    selectedTokens,
    setPurchaseAmounts,
    setSelectedTokens,
    isWhiteBox,
  ]);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  useEffect(() => {
    if (isWhiteBox && (selectedTokens.length === 0 || selectedTokens[0] !== "ETH")) {
      setSelectedTokens(["ETH"]);
    }
  }, [isWhiteBox, selectedTokens, setSelectedTokens]);

  useEffect(() => {
    if (isConfirming) {
      showToast("Transação enviada! Aguardando confirmação...", "info");
    }
  }, [isConfirming, showToast]);

  const addTokenRow = () => {
    if (isWhiteBox) return;
    
    if (purchaseAmounts.length < 4) {
      setPurchaseAmounts([...purchaseAmounts, ""]);
      setSelectedTokens([...selectedTokens, "None"]);
    }
  };

  const updateCurrentAmount = (value: string) => {
    const newAmounts = [...purchaseAmounts];
    newAmounts[currentTokenIndex] = value;
    setPurchaseAmounts(newAmounts);
  };

  const updateCurrentToken = (tokenCode: string) => {
    const newTokens = [...selectedTokens];
    newTokens[currentTokenIndex] = tokenCode;
    setSelectedTokens(newTokens);
    setIsTokenDropdownOpen(false);
  };

  const getAvailableTokens = () => {
    const supportedTokens = isWhiteBox 
      ? ["ETH"] 
      // : ["None", "ETH", "USDC", "LINK", "WETH"];
      : ["None","USDC" , "LINK"];

    if (!currencies || currencies.length === 0) {
      return [];
    }

    


    const filtered = currencies.filter((currency) => {
      const isSupported = supportedTokens.includes(currency.code);

      const isCurrentlySelected =
        currency.code === selectedTokens[currentTokenIndex];
      const isSelectedElsewhere =
        selectedTokens.includes(currency.code) && !isCurrentlySelected;



      return isSupported && !isSelectedElsewhere;
    });



    return filtered;
  };

  const getCurrentBalanceText = () => {
    const tokenCode = selectedTokens[currentTokenIndex];

    if (!isConnected) return "Connect Wallet";
    if (!balancesInitialized) return "[Balance] Loading...";

    if (tokenCode === "None") return "[Balance] 0";

    const currency = currencies.find((c) => c.code === tokenCode);
    if (!currency) return "[Balance] Token Not Found";

    let balance;
    if (tokenCode === "ETH") {
      balance = balances["Sepolia ETH"];
    } else {
      balance = balances[currency.name];
    }

    if (balance === undefined) {
      return "[Balance] 0.0000";
    }

    return `[Balance] ${balance.formattedBalance}`;
  };

  const getCurrentTokenText = () => {
    const tokenCode = selectedTokens[currentTokenIndex];
    return tokenCode === "None" ? "[Select]" : `[${tokenCode}]`;
  };

  const canPurchase = () => {
    if (!isConnected || isPending || isConfirming) return false;

    const validAmounts = purchaseAmounts.every((amount) => {
      const num = parseFloat(amount);
      return !isNaN(num) && num > 0;
    });

    const validTokens = selectedTokens.every((token) => token !== "None");

    return validAmounts && validTokens && purchaseAmounts.length > 0;
  };

  const handleSliderSwiped = async () => {
    try {
      if (!isConnected) {
        openConnectModal?.();
        setIsSliderSwiped(false);
        return;
      }

      purchaseAmounts.forEach((amount, index) => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
          throw new Error(`Invalid amount: ${amount}`);
        }
      });

      if (selectedTokens.includes("None")) {
        throw new Error("Please select a valid token for all rows");
      }

      selectedTokens.forEach((code, index) => {
        const currency = currencies.find((c) => c.code === code);
        if (!currency) {
          return;
        }

        let userBalance;
        if (code === "ETH") {
          userBalance = parseFloat(balances["Sepolia ETH"]?.balance || "0");
        } else {
          userBalance = parseFloat(balances[currency.name]?.balance || "0");
        }

        const purchaseAmount = parseFloat(purchaseAmounts[index]);

        if (purchaseAmount > userBalance) {
          throw new Error(`Insufficient balance for ${currency.code}`);
        }
      });

      if (isWhiteBox) {
        
        const tokenAddresses = selectedTokens
          .filter((code) => code !== "None")
          .map((code) => {
            const currency = currencies.find((c) => c.code === code);
            return currency?.address || "0x0000000000000000000000000000000000000000";
          });

        setPurchaseData({
          tokens: tokenAddresses,
          amounts: purchaseAmounts.filter((_, index) => selectedTokens[index] !== "None"),
          selectedTokens: selectedTokens.filter(token => token !== "None"),
          purchaseAmounts: purchaseAmounts.filter((_, index) => selectedTokens[index] !== "None"),
        });

        showToast("Purchase data saved! Proceeding to donation selection...", "success");
        goToNextStep();
        
      } else {
        const tokenAddresses = selectedTokens
          .filter((code) => code !== "None")
          .map((code) => {
            const currency = currencies.find((c) => c.code === code);
            const address = currency?.address || "";
            return address;
          });

        const boxType = title.toLowerCase().includes("silver") ? "silver" : "blue";
        
        purchaseBox(
          boxType as "blue" | "silver",
          tokenAddresses,
          purchaseAmounts.filter((_, index) => selectedTokens[index] !== "None"),
        );
        
        const boxId = getBoxId(boxType);
        
        const result = await buyMysteryBox(
          boxId,
          purchaseAmounts.filter((_, index) => selectedTokens[index] !== "None"),
          tokenAddresses
        );
        
        if (result.receipt?.transactionHash) {
          setTransactionHash(result.receipt.transactionHash);
          finishProcessing(result.rewards || []);
        } else {
          throw new Error(result.message || "Transaction failed");
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      showToast(errorMessage, "error");
      errorProcessing(errorMessage);
    }
    setIsSliderSwiped(false);
  };

  const nextToken = () => {
    if (currentTokenIndex < purchaseAmounts.length - 1) {
      setCurrentTokenIndex(currentTokenIndex + 1);
    }
  };

  const prevToken = () => {
    if (currentTokenIndex > 0) {
      setCurrentTokenIndex(currentTokenIndex - 1);
    }
  };



  return (
    <div
      className="bg-terminal-black"
      style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
    >
      <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
        <span className="text-terminal-green font-bold text-sm uppercase">
          {title}
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

      <div className="flex flex-row gap-8 p-6 h-[418px]">
        <div className="flex-1 flex flex-col justify-between">
          <div className="whitespace-pre-line text-sm text-white mb-6">
            {description}
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <div className="flex-1 relative w-32 min-w-32">
                <Button
                  value={getCurrentTokenText()}
                  variant="secondary"
                  className="!w-full"
                  rightIcon={
                    <motion.div
                      animate={{ rotate: isTokenDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                      <ChevronDown size={16} />
                    </motion.div>
                  }
                  onClick={() => !isWhiteBox && setIsTokenDropdownOpen(!isTokenDropdownOpen)}
                  disabled={isWhiteBox}
                />

                <AnimatePresence>
                  {isTokenDropdownOpen && !isWhiteBox && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full mb-1 left-0 right-0 bg-terminal-black border border-terminal-green z-50 max-h-48 overflow-y-auto"
                      style={{
                        clipPath:
                          "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
                      }}
                    >
                      <div className="py-2">
                        {(() => {
                          const availableTokens = getAvailableTokens();

                          return availableTokens.map((currency) => (
                            <button
                              key={currency.code}
                              className="w-full px-4 py-2 text-left text-sm text-terminal-green hover:bg-terminal-green-hover cursor-pointer transition-colors border-b border-terminal-green last:border-b-0"
                              onClick={() => updateCurrentToken(currency.code)}
                            >
                              <div className="flex justify-between items-center">
                                <div>
                                  <div className="font-bold hover:underline">
                                    [
                                    {currency.code === "None"
                                      ? "Select"
                                      : currency.code}
                                    ]
                                  </div>
                                  <div className="text-xs text-terminal-gray-light">
                                    {currency.name}
                                  </div>
                                </div>
                              </div>
                            </button>
                          ));
                        })()}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button
                value={getCurrentBalanceText()}
                variant="secondary"
                className={`${!isConnected ? "text-red-400" : "text-terminal-white"} !whitespace-nowrap !w-48 !min-w-48`}
              />
            </div>

            <DonationInput
              value={purchaseAmounts[currentTokenIndex] || ""}
              onChange={updateCurrentAmount}
              placeholder="0"
              data-testid="amount-input"
            />

            {purchaseAmounts.length > 1 && (
              <div className="flex justify-between items-center text-sm text-terminal-green">
                <button
                  onClick={prevToken}
                  disabled={currentTokenIndex === 0}
                  className="disabled:opacity-50"
                >
                  ← Previous
                </button>
                <span>
                  Token {currentTokenIndex + 1} of {purchaseAmounts.length}
                </span>
                <button
                  onClick={nextToken}
                  disabled={currentTokenIndex === purchaseAmounts.length - 1}
                  className="disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}

            <Button
              value="[Add Token]"
              variant="primary"
              leftIcon={<PlusIcon size={18} />}
              text="center"
              onClick={addTokenRow}
              disabled={purchaseAmounts.length >= 4 || isWhiteBox}
            />
          </div>
        </div>

        <div className="w-[260px] flex flex-col items-center justify-between">
          <div className="relative border-2 border-white p-2">
            <Image
              src={image}
              alt={title}
              width={220}
              height={250}
              className="w-[220px] h-[250px] object-contain"
            />
          </div>

          <div className="w-full">
            <SliderButton
              text={
                !isConnected
                  ? "[Connect Wallet]"
                  : isPending
                    ? "[Processing...]"
                    : isConfirming
                      ? "[Confirming...]"
                      : "[Swipe to purchase]"
              }
              onClick={handleSliderSwiped}
              disabled={!canPurchase()}
              isSwiped={isSliderSwiped}
              onSwipeChange={setIsSliderSwiped}
              data-testid="purchase-slider"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialStep;
