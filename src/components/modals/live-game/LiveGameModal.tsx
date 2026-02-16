import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import AssetsFrame from "./LiveGameFrame";

interface LiveGameModalProps {
  onClose: () => void;
}

const CLIP_PATH =
  "polygon(25px 0%, 100% 0%, 100% 25px, 100% calc(100% - 25px), calc(100% - 25px) 100%, 25px 100%, 0% calc(100% - 25px), 0% 25px)";
const ANIMATION_DURATION = 300;

const LIVE_GAMES = [
  {
    player: "KanyeWest16",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "White Box",
    boxIcon: "/boxes/whiteBox.svg",
  },
  {
    player: "GamerDude92",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "Red Box",
    boxIcon: "/boxes/redBox.svg",
  },
  {
    player: "EpicNinjaX",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "Blue Box",
    boxIcon: "/boxes/blueBox.svg",
  },
  {
    player: "StealthyFox",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "White Box",
    boxIcon: "/boxes/whiteBox.svg",
  },
  {
    player: "DragonSlayer77",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "White Box",
    boxIcon: "/boxes/whiteBox.svg",
  },
  {
    player: "PixelWarrior",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "White Box",
    boxIcon: "/boxes/whiteBox.svg",
  },
  {
    player: "CosmicRider",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "Silver Box",
    boxIcon: "/boxes/silverBox.svg",
  },
  {
    player: "ThunderBolt",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "Blue Box",
    boxIcon: "/boxes/blueBox.svg",
  },
  {
    player: "ShadowHunter",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "White Box",
    boxIcon: "/boxes/whiteBox.svg",
  },
  {
    player: "VortexMaster",
    bet: "1 VOC",
    reward: "1 SOL",
    boxType: "Silver Box",
    boxIcon: "/boxes/silverBox.svg",
  },
];

const LiveGameRow: React.FC<{ game: (typeof LIVE_GAMES)[0] }> = ({ game }) => (
  <div className="flex items-center h-10 border-b border-terminal-green px-6 text-xs hover:bg-terminal-green-hover cursor-pointer">
    <span className="w-[38%] text-terminal-green">{game.player}</span>
    <span className="w-[18%] text-terminal-green text-center">{game.bet}</span>
    <span className="w-[22%] text-terminal-green text-center">
      {game.reward}
    </span>
    <span className="w-[26%] flex items-center gap-2">
      <Image
        src={game.boxIcon}
        alt={game.boxType}
        width={18}
        height={18}
        className="w-4 h-4"
      />
      <span>{game.boxType}</span>
    </span>
  </div>
);

const LiveGameModal: React.FC<LiveGameModalProps> = ({ onClose }) => {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

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
      className="fixed inset-0 flex items-center justify-center bg-terminal-black/80 z-50 transition-opacity duration-300"
      style={{ opacity: isClosing ? 0 : 1 }}
      onClick={handleClose}
    >
      <AssetsFrame position="left" />
      <AssetsFrame position="right" />
      <div
        className={modalClasses}
        style={{ clipPath: CLIP_PATH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-terminal-black" style={{ clipPath: CLIP_PATH }}>
          <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
            <span className="text-terminal-green font-bold text-sm uppercase">
              LIVE GAMES
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
            <span className="w-[36%] text-terminal-white">Player</span>
            <span className="w-[20%] text-center">Bet</span>
            <span className="w-[20%] text-center">Reward</span>
            <span className="w-[26%] flex items-center gap-2">Box Type</span>
          </div>
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {LIVE_GAMES.map((game, index) => (
              <LiveGameRow key={index} game={game} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveGameModal;
