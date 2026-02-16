import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import ProgressBarProcessing from "../ProgressBarProcessing";

interface FinishedStepProps {
  onClose: () => void;
  CLIP_PATH: string;
}

const FinishedStep: React.FC<FinishedStepProps> = ({ onClose, CLIP_PATH }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const duration = 300000;
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
      className="bg-terminal-black text-terminal-green font-mono rounded-lg p-0 relative"
      style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
    >
      <div
        className="relative border-b-2 border-terminal-green flex items-center justify-between px-6"
        style={{ height: 40 }}
      >
        <span className="text-terminal-green font-bold text-sm uppercase tracking-widest">
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
        <ProgressBarProcessing progress={100} complete />
      </div>
      <div className="flex flex-col items-center justify-center w-full pb-2 border-t-2 border-terminal-green pt-6 mt-6">
        <Image
          src="/Sucesso.svg"
          alt="success state"
          width={600}
          height={620}
        />
      </div>
    </div>
  );
};

export default FinishedStep;
