import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import ProgressBarProcessing from "../ProgressBarProcessing";
import { PurchaseStep } from "@/stores/mysteryBoxStore";

interface ProcessingStepProps {
  onClose: () => void;
  CLIP_PATH: string;
}

const ProcessingStep: React.FC<ProcessingStepProps> = ({
  onClose,
  CLIP_PATH,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const duration = 300;
    const interval = 20;
    const steps = duration / interval;
    let current = 0;
    const timer = setInterval(() => {
      current++;
      setProgress(Math.min(100, (current / steps) * 100));
      if (current >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className="bg-terminal-black text-[#ff9900] font-mono rounded-lg p-0 relative"
      style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
    >
      <div
        className="relative border-b-2 border-[#ff9900] flex items-center justify-between px-6"
        style={{ height: 40 }}
      >
        <span className="text-[#ff9900] font-bold text-sm uppercase tracking-widest">
          PURCHASING YOUR BOX
        </span>
        <button onClick={onClose} className="flex items-center gap-2 group">
          <span className="text-terminal-gray-light font-bold text-sm group-hover:underline">
            EXIT
          </span>
          <X
            size={16}
            className="text-terminal-gray-light group-hover:text-white transition-colors"
          />
        </button>
      </div>
      <div className="flex flex-col gap-0 p-6 pb-0">
        <ProgressBarProcessing progress={progress} />
      </div>
      <div className="flex flex-col items-center justify-center w-full pb-2 border-t-2 border-terminal-orange pt-6 mt-6">
        <style jsx>{`
          @keyframes slide-infinite {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-66.666%);
            }
          }
          .carousel-container {
            width: 600px;
            height: 620px;
            overflow: hidden;
            position: relative;
          }
          .carousel-track {
            display: flex;
            width: 1800px;
            animation: slide-infinite 12s linear infinite;
          }
          .carousel-item {
            flex-shrink: 0;
            width: 600px;
            height: 620px;
          }
        `}</style>
        <div className="carousel-container">
          <div className="carousel-track">
            <div className="carousel-item">
              <Image
                src="/processingAnimation.svg"
                alt="processing animation"
                width={600}
                height={620}
              />
            </div>
            <div className="carousel-item">
              <Image
                src="/processingAnimation.svg"
                alt="processing animation"
                width={600}
                height={620}
              />
            </div>
            <div className="carousel-item">
              <Image
                src="/processingAnimation.svg"
                alt="processing animation"
                width={600}
                height={620}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessingStep;
