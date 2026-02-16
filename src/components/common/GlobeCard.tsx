import React from "react";
import OptimizedImage from "./OptimizedImage";

interface GlobeCardProps {
  image1: string;
  image2: string;
  title: string;
}

const clipPath =
  "polygon(15px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 15px)";

const GlobeCard: React.FC<GlobeCardProps> = ({ image1, image2, title }) => {
  return (
    <div className="relative w-full h-full group">
      <div
        className="absolute inset-0 bg-terminal-green"
        style={{ clipPath, transform: "scale(1.01)" }}
      />
      <div
        className="relative w-full h-full bg-terminal-black font-mono text-base text-terminal-white flex flex-col"
        style={{ clipPath }}
      >
        <span className="text-terminal-green font-bold text-sm tracking-widest uppercase font-mono pt-1 z-10 border-b-2 border-terminal-green block pl-4">
          {title}
        </span>
        <div className="flex flex-row flex-1 min-h-0 w-full">
          <div className="relative w-1/2 h-full border-r border-terminal-green">
            <OptimizedImage
              src={image1}
              alt="Image 1"
              fill
              className="object-contain"
              priority={true}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            />
          </div>
          <div className="relative w-1/2 h-full">
            <OptimizedImage
              src={image2}
              alt="Image 2"
              fill
              className="object-cover"
              priority={true}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobeCard;
