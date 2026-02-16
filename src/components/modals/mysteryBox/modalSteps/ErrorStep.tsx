import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import ProgressBarProcessing from "../ProgressBarProcessing";

interface ErrorStepProps {
  onClose: () => void;
  CLIP_PATH: string;
  onRetry?: () => void;
}

const ErrorStep: React.FC<ErrorStepProps> = ({
  onClose,
  CLIP_PATH,
  onRetry,
}) => {
  const [progress, setProgress] = useState(100); 

  return (
    <div
      className="bg-terminal-black text-terminal-red font-mono rounded-lg p-0 relative"
      style={{ width: 648, height: 448, clipPath: CLIP_PATH }}
    >
      <div
        className="relative border-b-2 border-terminal-red flex items-center justify-between px-6"
        style={{ height: 40 }}
      >
        <span className="text-terminal-red font-bold text-sm uppercase tracking-widest">
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
        <ProgressBarProcessing progress={progress} error onRetry={onRetry} />
      </div>
      <div className="flex flex-col items-center justify-center w-full pb-2 border-t-2 border-terminal-red pt-6 mt-6">
        <Image
          src="/Erro.svg"
          alt="error state"
          width={600}
          height={620}
        />
      </div>
    </div>
  );
};

export default ErrorStep;
