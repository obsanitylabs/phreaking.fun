import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import InformationFrame from "./InformationFrame";

interface InformationModalProps {
  onClose: () => void;
}

const CLIP_PATH =
  "polygon(0px 0%, 100% 0%, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0% 100%, 0% 25px)";
const ANIMATION_DURATION = 300;

const MODAL_DESCRIPTION = `Mystery Box is a thrilling casino game where you enter a world of surprise and suspense! Simply input your token, and unlock a hidden box filled with exciting rewards. Each box is a mystery—will you hit the jackpot or score rare crypto treasures? With every spin, the chance for huge wins and exclusive prizes is in your hands. Take a risk, crack open the Mystery Box, and see what fortune holds for you!`;

const InformationModal: React.FC<InformationModalProps> = ({ onClose }) => {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setShow(false);
    setTimeout(onClose, ANIMATION_DURATION);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-terminal-black/80 z-50 transition-opacity duration-300"
      style={{ opacity: isClosing ? 0 : 1 }}
      onClick={handleClose}
    >
      <InformationFrame position="left" />
      <div
        className={`w-[600px] font-mono text-terminal-white p-[1px] bg-terminal-green transition-all duration-300 ${show ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-terminal-black" style={{ clipPath: CLIP_PATH }}>
          <div className="relative h-10 flex items-center justify-between px-6">
            <span></span>
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
          <div className="pl-20 pr-12">
            <div className="text-terminal-white font-bold text-[20px] uppercase">
              INFORMATION
            </div>
            <InformationFrame position="text" />
            <div className="py-8">
              <span className="whitespace-pre-line text-sm leading-relaxed">
                {MODAL_DESCRIPTION}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationModal;
