import Image from "next/image";
import { ProgressBar } from "@/components/ui/progressBar";
import { useEffect, useState } from "react";

const Timer: React.FC<{ className?: string }> = ({ className }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((val) => val.toString().padStart(2, "0"))
      .join(":");
  };

  return <div className={className}>{formatTime(seconds)}</div>;
};

const SidebarProcessingStep: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 font-mono w-[240px] rounded-lg p-4 shadow-lg bg-terminal-black/80 ">
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center gap-2">
          <Image src="/code-one-O.svg" alt="code-one" width={55} height={55} />
          <div className="uppercase tracking-widest text-xs text-terminal-orange">
            CONSOLE 1
            <div className="text-terminal-orange text-base">TERMINAL</div>
          </div>
        </div>
      </div>
      <div className="text-terminal-orange text-base ">TIME</div>
      <Timer className="text-terminal-orange text-[36px] mb-2" />
      <div className="text-terminal-gray-light text-base mb-2">
        Uploading Order...
      </div>
      <div className="text-terminal-orange text-base mb-2">
        → This may take a few minutes_
      </div>
      <div className="mt-2"></div>
    </div>
  );
};

export default SidebarProcessingStep;
