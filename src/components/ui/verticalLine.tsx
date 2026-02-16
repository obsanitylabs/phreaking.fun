"use client";
import React, { useEffect, useRef } from "react";

interface VerticalLineProps {
  greenPercentage?: number;
  className?: string;
  showDiamonds?: boolean;
  diamondColor?: string;
}

export const VerticalLine: React.FC<VerticalLineProps> = ({
  greenPercentage = 30,
  className = "",
  showDiamonds = true,
  diamondColor = "bg-terminal-green",
}) => {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateDividerPosition = () => {};

    calculateDividerPosition();
    const resizeObserver = new ResizeObserver(calculateDividerPosition);
    const currentRef = lineRef.current;

    if (currentRef) {
      resizeObserver.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        resizeObserver.unobserve(currentRef);
      }
    };
  }, [greenPercentage]);

  return (
    <div className={`h-full w-0.5 relative ${className}`}>
      {/* Vertical line */}
      <div
        ref={lineRef}
        className="absolute left-0 top-0 w-0.5 h-full flex flex-col"
      >
        <div
          className="bg-terminal-green w-full"
          style={{ height: `${greenPercentage}%` }}
        ></div>
        <div
          className="bg-terminal-gray w-full"
          style={{ height: `${99 - greenPercentage}%` }}
        ></div>
      </div>

      {showDiamonds && (
        <>
          {/* Top diamond */}
          <div
            className={`absolute -left-[3px] top-0 w-2 h-2 ${diamondColor} z-10 transform rotate-45`}
          ></div>

          {/* Middle diamond - at the division between green and gray */}
          <div
            className={`absolute -left-[3px] w-2 h-2 ${diamondColor} z-20 transform rotate-45`}
            style={{ top: `calc(${greenPercentage}% - 4px)` }}
          ></div>

          <div
            className={`absolute -left-[3px] bottom-0 w-2 h-2 ${diamondColor} z-10 transform rotate-45`}
          ></div>
        </>
      )}
    </div>
  );
};

export default VerticalLine;
