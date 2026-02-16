import React from "react";
import OptimizedImage from "./OptimizedImage";

interface MysteryBoxCardProps {
  title: string;
  image: string;
  onClick?: () => void;
  available?: boolean;
  description?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  type?: string;
}

const MysteryBoxCard: React.FC<MysteryBoxCardProps> = ({
  title,
  image,
  onClick,
  available = true,
  onMouseEnter,
  onMouseLeave,
}) => {
  return (
    <div
      className={`w-[220px] h-full bg-black font-space-mono text-white flex flex-col group ${available ? "cursor-pointer" : "cursor-not-allowed"}`}
      onClick={available ? onClick : undefined}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="text-white bg-[#404140] font-semibold text-[10px] text-center py-1 px-3 group-hover:bg-white group-hover:text-black transition-colors">
        {title}
      </span>
      <div className="flex-1 flex items-center justify-center p-4 border-[0.877px] border-[rgba(255,255,255,0.05)] group-hover:border-white transition-colors duration-500 mt-4 relative">
        <OptimizedImage
          src={image}
          alt={title}
          width={120}
          height={160}
          className="object-contain transition-transform duration-500 group-hover:scale-110"
          sizes="(max-width: 768px) 220px, 120px"
        />
        {!available && (
          <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300 absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-20">
            <span className="text-white font-bold text-base tracking-widest text-center">
              AVAILABLE SOON
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MysteryBoxCard;
