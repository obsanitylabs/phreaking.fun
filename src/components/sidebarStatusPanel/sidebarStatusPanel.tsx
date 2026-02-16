"use client";
import React, { useState } from "react";
import Image from "next/image";
import { useAccount } from "wagmi";
import { ProgressBar } from "../ui/progressBar";
import { VerticalLine } from "../ui/verticalLine";

interface SidebarStatusPanelProps {
  hoveredBoxName?: string;
  hoveredBoxDescription?: string;
  hoveredBoxType?: string;
}

const SidebarStatusPanel = ({
  hoveredBoxName,
  hoveredBoxDescription,
  hoveredBoxType,
}: SidebarStatusPanelProps) => {
  const [animationType, setAnimationType] = useState<"center" | "leftToRight">(
    "center",
  );
  const { isConnected } = useAccount();

  const toggleAnimationType = () => {
    setAnimationType((prev) => (prev === "center" ? "leftToRight" : "center"));
  };

  return (
    <div className="flex flex-col font-mono w-full overflow-hidden text-sm relative flex-1 mx-2">
      <div
        className="fixed z-0"
        style={{ top: "120px", height: "calc(100vh - 140px)" }}
      >
        <VerticalLine greenPercentage={40} className="h-full" />
      </div>

      <div className="relative pl-6 overflow-y-auto flex-grow">
        <div className="flex flex-col gap-3 pb-4">
          <div className="flex items-center gap-2">
            <Image src="/code-one.svg" alt="code-one" width={55} height={55} />
            <div className="uppercase tracking-widest text-xs text-terminal-green">
              CONSOLE 1
              <div className="text-terminal-green-light text-base">
                TERMINAL
              </div>
            </div>
          </div>

          <div className="h-0.5 w-full bg-terminal-green"></div>

          <p className="text-terminal-gray-light text-base">
            SYSTEM INITIALIZED
          </p>

          <div className="flex flex-col gap-2">
            <p className="text-terminal-white text-base">SEQUENCE</p>
            <p className="text-terminal-green">
              <span>➜</span> 3 OF 3 (100% PERCENT)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-terminal-green flex items-center justify-center">
              <Image src="/check.svg" alt="check" width={16} height={16} />
            </div>
            <p className="text-terminal-green">ACCESS GRANTED</p>
          </div>

          <div className="space-y-1">
            <p className="text-terminal-white">
              {isConnected ? "Wallet Connected" : "Please connect wallet to continue ..."}
            </p>
            <p
              className="text-terminal-green cursor-pointer"
              onClick={toggleAnimationType}
            >
              ➤_
            </p>

            <ProgressBar animationType={animationType} />
          </div>

          <div className="flex items-center gap-2 relative h-[48px] w-full mt-2">
            <Image
              src="/frameInformationText.svg"
              alt="arrow-right"
              width={200}
              height={32}
              style={{ width: 'auto', height: 'auto' }}
              className={`${hoveredBoxName ? "block mt-6" : "block"}`}
            />
            <span className="absolute left-12 top-1 text-terminal-white font-bold text-base leading-none select-none pointer-events-none">
              {hoveredBoxName
                ? `${hoveredBoxName}${hoveredBoxType ? ` : (${hoveredBoxType})` : ""}`
                : "Rewards"}
            </span>
          </div>
          <p
            className={`text-terminal-white text-sm min-h-[40px] ${hoveredBoxName ? "mt-4" : ""}`}
          >
            {hoveredBoxDescription ||
              "hover over one of the boxes to learn more about the rewards"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SidebarStatusPanel;
