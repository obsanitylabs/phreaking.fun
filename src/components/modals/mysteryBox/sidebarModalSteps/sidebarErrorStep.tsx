import Image from "next/image";
import { useMysteryBoxStore } from "@/stores";

const Timer: React.FC<{ className?: string; frozenTime: number }> = ({ className, frozenTime }) => {
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return [hours, minutes, seconds]
      .map((val) => val.toString().padStart(2, "0"))
      .join(":");
  };

  return <div className={className}>{formatTime(frozenTime)}</div>;
};

const SidebarErrorStep: React.FC = () => {
  const state = useMysteryBoxStore();
  
  const errorTime = state.processingTime;

  return (
    <div className="flex flex-col gap-3 font-mono w-[240px] rounded-lg p-4 shadow-lg bg-terminal-black/80 ">
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center gap-2">
          <Image src="/code-one-R.svg" alt="code-one" width={55} height={55} />
          <div className="uppercase tracking-widest text-xs text-terminal-red">
            CONSOLE 1
            <div className="text-terminal-red text-base">TERMINAL</div>
          </div>
        </div>
      </div>
      <div className="text-terminal-red text-base ">TIME</div>
      <Timer className="text-terminal-red text-[36px] mb-2" frozenTime={errorTime} />
      <div className="text-terminal-gray-light text-base mb-2">
        TRANSACTION ERROR: PAYLOAD TIMEOUT
      </div>
      <div className="text-terminal-red text-base">
        → POSSIBLE CAUSES: <br />- Network congestion <br />- Insufficient gas fees <br />- Wallet connection lost
      </div>
    </div>
  );
};

export default SidebarErrorStep;
