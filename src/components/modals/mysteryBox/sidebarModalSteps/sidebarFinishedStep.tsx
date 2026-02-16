import React from "react";
import Image from "next/image";
import { useMysteryBoxStore } from "@/stores";

const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return [hours, minutes, secs]
    .map((val) => val.toString().padStart(2, "0"))
    .join(":");
};

const SidebarFinishedStep: React.FC = () => {
  const state = useMysteryBoxStore();

  return (
    <div className="flex flex-col gap-3 font-mono w-[240px] rounded-lg p-4 shadow-lg bg-terminal-black/80 ">
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center gap-2">
          <Image src="/code-one.svg" alt="code-one" width={55} height={55} />
          <div className="uppercase tracking-widest text-xs text-terminal-green">
            CONSOLE 1
            <div className="text-terminal-green text-base">TERMINAL</div>
          </div>
        </div>
      </div>
      <div className="text-terminal-green text-base ">TIME</div>
      <div className="text-terminal-green text-[36px] mb-2">
        {formatTime(state.processingTime)}
      </div>
      <div className="text-terminal-gray-light text-base mb-2">
        Opening your box. Transaction Confirmed! Check your Wallet
      </div>
      <div className="text-terminal-green text-base mb-2">
        → Please stay on this page and keep this browser tab open
      </div>
      <div className="mt-2"></div>
    </div>
  );
};

export default SidebarFinishedStep;
