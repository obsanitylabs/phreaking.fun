import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import TopWinnersFrame from "./TopWinnersFrame";

interface TopWinnersModalProps {
  onClose: () => void;
}

const CLIP_PATH =
  "polygon(25px 0%, 100% 0%, 100% 25px, 100% calc(100% - 25px), calc(100% - 25px) 100%, 25px 100%, 0% calc(100% - 25px), 0% 25px)";
const ANIMATION_DURATION = 300;

const LIVE_GAMES = [
  { player: "KanyeWest16", bet: "1 VOC", reward: "1 SOL" },
  { player: "GamerDude92", bet: "1 VOC", reward: "1 SOL" },
  { player: "EpicNinjaX", bet: "1 VOC", reward: "1 SOL" },
  { player: "StealthyFox", bet: "1 VOC", reward: "1 SOL" },
  { player: "DragonSlayer77", bet: "1 VOC", reward: "1 SOL" },
  { player: "PixelWarrior", bet: "1 VOC", reward: "1 SOL" },
  { player: "CosmicRider", bet: "1 VOC", reward: "1 SOL" },
  { player: "ThunderBolt", bet: "1 VOC", reward: "1 SOL" },
  { player: "ShadowHunter", bet: "1 VOC", reward: "1 SOL" },
  { player: "VortexMaster", bet: "1 VOC", reward: "1 SOL" },
];

const TAB_LIST = [
  { label: "TOP DAY WINNERS", key: "day" },
  { label: "TOP ALL WINNERS", key: "all" },
];

const PositionIcon: React.FC<{ pos: number }> = ({ pos }) => {
  if (pos === 1) {
    return (
      <Image
        src="/crown.svg"
        alt="Crown"
        width={18}
        height={18}
        className="inline-block mr-2"
      />
    );
  }
  return (
    <Image
      src="/trophy.svg"
      alt="Trophy"
      width={16}
      height={16}
      className="inline-block mr-2"
    />
  );
};

const LiveGameRow: React.FC<{
  game: (typeof LIVE_GAMES)[0];
  index: number;
}> = ({ game, index }) => (
  <div
    className={`flex items-center h-10 border-b border-terminal-green px-6 text-sm transition bg-transparent ${
      index === 0 ? "bg-terminal-green/10 border-l-4 border-terminal-green" : ""
    } hover:bg-terminal-green-hover cursor-pointer`}
  >
    <span className="w-[8%] flex items-center justify-center">
      <PositionIcon pos={index + 1} />
      <span
        className={`ml-1 ${index === 0 ? "font-bold text-terminal-white" : "text-terminal-green"}`}
      >
        {index + 1}
      </span>
    </span>
    <span
      className={`w-[38%] ${index === 0 ? "font-bold text-terminal-white" : "text-terminal-green"}`}
    >
      {game.player}
    </span>
    <span
      className={`w-[18%] text-center ${index === 0 ? "font-bold text-terminal-white" : "text-terminal-green"}`}
    >
      {game.bet}
    </span>
    <span
      className={`w-[18%] text-center ${index === 0 ? "font-bold text-terminal-white" : "text-terminal-green"}`}
    >
      {game.reward}
    </span>
  </div>
);

const TopWinnersModal: React.FC<TopWinnersModalProps> = ({ onClose }) => {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState("day");

  useEffect(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setShow(false);
    setTimeout(onClose, ANIMATION_DURATION);
  };

  const modalClasses = `w-[700px] font-mono text-terminal-white p-[1px] bg-terminal-green transition-all duration-300 ${
    show ? "opacity-100 scale-100" : "opacity-0 scale-95"
  }`;

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-terminal-black/80 z-50 transition-opacity duration-300"
      style={{ opacity: isClosing ? 0 : 1 }}
      onClick={handleClose}
    >
      <div className="flex items-center justify-center gap-2 mb-2 z-50">
        {TAB_LIST.map((tab) => (
          <button
            key={tab.key}
            className={`px-6 py-1 rounded border-2 font-bold text-sm uppercase transition-all
              ${
                activeTab === tab.key
                  ? "border-terminal-green bg-terminal-green/20 text-terminal-green shadow-[0_0_8px_#00FF9C55]"
                  : "border-terminal-gray text-terminal-gray-light bg-transparent hover:border-terminal-green hover:text-terminal-green"
              }`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(tab.key);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <TopWinnersFrame position="left" />
      <TopWinnersFrame position="right" />
      <div
        className={modalClasses}
        style={{ clipPath: CLIP_PATH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-terminal-black" style={{ clipPath: CLIP_PATH }}>
          <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
            <span className="text-terminal-green font-bold text-sm uppercase tracking-widest">
              LEADERBOARD
            </span>
            <button onClick={onClose} className="flex items-center gap-2 group">
              <span className="text-terminal-gray-light font-bold text-sm group-hover:underline">
                EXIT
              </span>
              <X
                size={16}
                className="text-terminal-gray-light transition-colors hover:text-terminal-green-light"
              />
            </button>
          </div>
          <div className="flex items-center h-10 border-b border-terminal-green px-6 text-base">
            <span className="w-[8%] text-terminal-green text-center font-bold">
              #
            </span>
            <span className="w-[38%] text-terminal-white font-bold">
              Player
            </span>
            <span className="w-[18%] text-center font-bold">Bet</span>
            <span className="w-[18%] text-center font-bold">Reward</span>
          </div>
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {LIVE_GAMES.map((game, index) => (
              <LiveGameRow key={index} game={game} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopWinnersModal;
