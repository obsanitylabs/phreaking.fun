import Image from "next/image";
import { ProgressBar } from "@/components/ui/progressBar";

const sidebarInitialStep: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 font-mono w-[240px] rounded-lg p-4 shadow-lg bg-terminal-black/80 ">
      <div className="flex flex-col gap-3 pb-4">
        <div className="flex items-center gap-2">
          <Image src="/code-one.svg" alt="code-one" width={55} height={55} />
          <div className="uppercase tracking-widest text-xs text-terminal-green">
            CONSOLE 1
            <div className="text-terminal-green-light text-base">TERMINAL</div>
          </div>
        </div>
        <ProgressBar animationType={"leftToRight"} />
      </div>
      <div className="text-terminal-white text-xs mb-2">
        PROCESSING CONTRACT PAYLOAD...
      </div>
      <div className="text-terminal-green text-xs mb-2">
        → [ ██████████ ] 100% COMPLETE
      </div>
      <div className="text-terminal-white text-xs mb-2">
        Ready to GENERATED SMART CONTRACTS:
      </div>
      <div className="text-terminal-green text-xs mb-2">
        {">"}_ Awaiting for user input
      </div>
      <div className="mt-2"></div>
    </div>
  );
};

export default sidebarInitialStep;
