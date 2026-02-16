"use client";
import { useState, useEffect } from "react";

type ProgressBarProps = {
  animationType: "center" | "leftToRight";
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ animationType }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(progress < 100 ? progress + 0.25 : 0);
    }, 200);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="relative h-1 w-full flex justify-center items-center">
      <div className="absolute w-full h-0.5 bg-terminal-gray-dark"></div>
      {animationType === "center" ? (
        <div
          className="absolute h-1 bg-terminal-green transition-all duration-500 ease-in-out z-10"
          style={{
            width: `${progress}%`,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: "100%",
          }}
        ></div>
      ) : (
        <div
          className="absolute h-1 bg-terminal-green transition-all duration-500 ease-in-out z-10"
          style={{
            width: `${progress}%`,
            left: "0",
          }}
        ></div>
      )}
    </div>
  );
};
