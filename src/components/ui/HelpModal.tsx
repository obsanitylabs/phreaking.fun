import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronDown, ChevronRight, HelpCircle, Book, Play } from "lucide-react";
import Button from "@/components/ui/button";
import { useTutorialStore } from "@/stores";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I connect my wallet?",
    answer: "Click the 'Connect Wallet' button in the header. Make sure you have a compatible wallet like MetaMask installed. The platform supports Ethereum Mainnet and Sepolia Testnet."
  },
  {
    category: "Getting Started",
    question: "What are Phreaking Boxes?",
    answer: "Phreaking Boxes are interactive containers that offer token swaps and rewards. Each box type (Blue, Silver, etc.) has different characteristics and reward mechanisms."
  },
  {
    category: "Trading",
    question: "How do White Boxes work?",
    answer: "White Boxes allow you to make donations to 6 different institutions. You can choose to donate to a specific institution or make a random donation. Your contribution helps support the organizations."
  },
  {
    category: "Trading",
    question: "What's the difference between box types?",
    answer: "Blue Boxes offer portfolio swaps, Silver Boxes provide curated swaps with potential discounts/fees, and other boxes have specialized functions. Available boxes are highlighted in green."
  },
  {
    category: "Trading",
    question: "How do I purchase a box?",
    answer: "Select an available box, enter the amount you want to spend, choose your tokens, then drag the purchase slider to confirm your transaction."
  },
  {
    category: "Technical",
    question: "Which networks are supported?",
    answer: "The platform currently supports Ethereum Mainnet and Sepolia Testnet. Make sure your wallet is connected to one of these networks."
  },
  {
    category: "Technical",
    question: "What tokens can I use?",
    answer: "You can use ETH, USDC, LINK, and other supported tokens. The available tokens depend on the box type you select."
  },
  {
    category: "Troubleshooting",
    question: "My transaction failed, what should I do?",
    answer: "Check that you have sufficient funds for both the transaction and gas fees. Ensure you're on the correct network. If the problem persists, try refreshing the page."
  },
  {
    category: "Troubleshooting",
    question: "The slider won't work, why?",
    answer: "Make sure you're connected to a supported wallet and network, have entered a valid amount, and have sufficient balance. The slider is disabled until all requirements are met."
  }
];

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<string>("Getting Started");
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const { startTutorial, resetTutorial } = useTutorialStore();

  const categories = Array.from(new Set(FAQ_ITEMS.map(item => item.category)));
  const filteredItems = FAQ_ITEMS.filter(item => item.category === activeCategory);

  const handleStartTutorial = () => {
    onClose();
    resetTutorial();
    setTimeout(startTutorial, 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/80" />
        
        {/* Modal content */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          className="relative bg-terminal-black border-2 border-terminal-green font-mono text-terminal-green max-w-4xl w-full max-h-[90vh] overflow-hidden"
          style={{
            clipPath: 'polygon(15px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 15px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-terminal-green px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle size={24} />
              <h2 className="text-xl font-bold">Help & Support</h2>
            </div>
            <button
              onClick={onClose}
              className="text-terminal-green-dark hover:text-terminal-green transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex h-[calc(90vh-120px)]">
            {/* Sidebar */}
            <div className="w-1/4 border-r border-terminal-green p-4 space-y-4">
              {/* Tutorial Section */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-terminal-green-light">QUICK START</h3>
                <Button
                  value="Start Tutorial"
                  variant="primary"
                  leftIcon={<Play size={14} />}
                  className="!w-full !text-xs !py-2"
                  onClick={handleStartTutorial}
                />
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-terminal-green-light">CATEGORIES</h3>
                <div className="space-y-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setActiveCategory(category);
                        setExpandedItem(null);
                      }}
                      className={`w-full text-left text-xs p-2 border transition-colors ${
                        activeCategory === category
                          ? 'bg-terminal-green text-terminal-black border-terminal-green'
                          : 'bg-terminal-black text-terminal-green border-terminal-green hover:bg-terminal-green-hover'
                      }`}
                      style={{
                        clipPath: 'polygon(8px 0%, 100% 0%, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0% 100%, 0% 8px)',
                      }}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-6">
                  <Book size={20} />
                  <h3 className="text-lg font-bold">{activeCategory}</h3>
                </div>

                {filteredItems.map((item, index) => (
                  <div key={index} className="border border-terminal-green">
                    <button
                      onClick={() => setExpandedItem(expandedItem === index ? null : index)}
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-terminal-green-hover transition-colors"
                    >
                      <span className="text-sm font-medium">{item.question}</span>
                      {expandedItem === index ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {expandedItem === index && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-terminal-green"
                        >
                          <div className="p-4 text-sm text-terminal-white leading-relaxed">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-terminal-green px-6 py-4">
            <div className="flex items-center justify-between text-xs text-terminal-green-dark">
              <span>Need more help? Check our documentation or contact support.</span>
              <span>Phreaking Fun © 2025</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
