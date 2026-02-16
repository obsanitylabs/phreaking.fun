import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Button from "./button";
import { Token } from "./TokenDropdown";

interface ButtonDropdownProps {
  tokens: Token[];
  selectedToken: Token | null;
  onTokenSelect: (token: Token) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const ButtonDropdown: React.FC<ButtonDropdownProps> = ({
  tokens,
  selectedToken,
  onTokenSelect,
  isLoading = false,
  placeholder = "[Select]",
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

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token);
    setIsOpen(false);
  };

  const buttonText = selectedToken ? selectedToken.symbol : placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        value={isLoading ? "Loading..." : buttonText}
        variant="secondary"
        rightIcon={
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            <ChevronDown />
          </motion.div>
        }
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      />

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-1 left-0 bg-terminal-black border border-terminal-green rounded-lg shadow-lg z-50 min-w-[200px]"
          >
            <div className="py-2">
              {tokens.map((token) => (
                <div
                  key={token.address}
                  className="px-4 py-2 hover:bg-terminal-green/10 cursor-pointer transition-colors"
                  onClick={() => handleTokenSelect(token)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-terminal-green font-bold text-sm">
                        {token.symbol}
                      </div>
                      <div className="text-terminal-gray text-xs">
                        {token.name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-terminal-green text-sm">
                        {parseFloat(token.balance).toFixed(4)}
                      </div>
                      {token.hasMintFunction && (
                        <div className="text-terminal-green-light text-xs">
                          (Mintable)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ButtonDropdown;
