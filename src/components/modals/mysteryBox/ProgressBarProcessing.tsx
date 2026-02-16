import React from "react";

interface ProgressBarProcessingProps {
  progress: number;
  complete?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const ProgressBarProcessing: React.FC<ProgressBarProcessingProps> = ({
  progress,
  complete,
  error,
  onRetry,
}) => (
  <div className="flex flex-col gap-2">
    {complete ? (
      <div className="flex items-center gap-4 mb-2">
        <span className="text-terminal-green font-bold text-2xl tracking-widest">
          COMPLETE
        </span>
        <span className="text-white font-bold text-base ml-2">
          BOX PURCHASED
        </span>
      </div>
    ) : error ? (
      <div className="flex items-center gap-4 mb-2">
        <span className="text-terminal-red font-bold text-2xl tracking-widest px-2 py-1 rounded">
          ERROR
        </span>
        <span className="text-white text-base font-mono ml-2">
          TRANSACTION FAILED
        </span>
      </div>
    ) : (
      <div className="flex items-center gap-4 mb-2">
        <span className="text-[#ff9900] font-bold text-2xl tracking-widest px-2 py-1 rounded">
          PROCESSING
        </span>
        <span className="text-white text-base font-mono ml-2">
          UPLOADING YOUR REQUEST
        </span>
      </div>
    )}
    <div className="flex items-center gap-4">
      <div
        className={`flex-1 h-6 border-2 ${
          complete ? "border-terminal-green" : error ? "border-terminal-red" : "border-[#ff9900]"
        } relative overflow-hidden`}
      >
        <div
          className={`absolute left-0 top-0 h-full ${
            complete ? "bg-terminal-green" : error ? "bg-terminal-red" : "bg-[#ff9900]"
          } transition-all duration-200`}
          style={{ width: `${complete || error ? 100 : progress}%` }}
        />
      </div>
      <span 
        className="text-terminal-red text-sm font-mono ml-4 cursor-pointer hover:underline"
        onClick={onRetry}
      >
        #REBOOT
      </span>
    </div>
  </div>
);

export default ProgressBarProcessing;
