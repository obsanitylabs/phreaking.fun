import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance: string;
  hasMintFunction?: boolean;
}

interface TokenDropdownProps {
  tokens: Token[];
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  placeholder?: string;
  disabled?: boolean;
}

const TokenDropdown: React.FC<TokenDropdownProps> = ({
  tokens,
  selectedToken,
  onTokenSelect,
  placeholder = "[Select Token]",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
  };

  const buttonClipPath =
    "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";

  const [buttonPosition, setButtonPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          ref={buttonRef}
          onClick={handleToggle}
          disabled={disabled}
          className={`
            relative w-full h-10 px-4 text-sm font-bold font-mono
            bg-terminal-gray-dark border border-terminal-green text-terminal-green
            hover:bg-terminal-green hover:text-black transition-colors
            flex items-center justify-between
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          style={{ clipPath: buttonClipPath }}
        >
          <span className="truncate">
            {selectedToken ? `[${selectedToken.symbol}]` : placeholder}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-shrink-0 ml-2"
          >
            <ChevronDown />
          </motion.div>
        </button>
      </div>

      {/* Dropdown renderizado no body usando posicionamento fixo */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-[99999] mt-1 bg-terminal-black border border-terminal-green max-h-48 overflow-y-auto shadow-2xl"
            style={{
              clipPath: buttonClipPath,
              top: buttonPosition.top + 4,
              left: buttonPosition.left,
              width: buttonPosition.width,
            }}
          >
            {tokens.length === 0 ? (
              <div className="px-4 py-3 text-sm text-terminal-gray-light">
                Nenhum token disponível
              </div>
            ) : (
              tokens.map((token) => (
                <button
                  key={token.address}
                  onClick={() => handleTokenSelect(token)}
                  className="w-full px-4 py-3 text-left text-sm text-terminal-green hover:bg-terminal-green hover:text-black transition-colors border-b border-terminal-green-dark last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">[{token.symbol}]</div>
                      <div className="text-xs text-terminal-gray-light hover:text-black">
                        {token.name}
                      </div>
                    </div>
                    {token.balance && (
                      <div className="text-xs text-terminal-gray-light hover:text-black">
                        {token.balance}
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TokenDropdown;
