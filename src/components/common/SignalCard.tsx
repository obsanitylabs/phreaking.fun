import React from "react";
import Image from "next/image";

interface SignalCardProps {
  image: string;
  title: string;
}

const clipPath =
  "polygon(15px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 15px)";

const SignalCard: React.FC<SignalCardProps> = ({ image, title }) => {
  return (
    <div className="relative w-full h-full group">
      <div
        className="absolute inset-0 bg-green-400"
        style={{ clipPath, transform: "scale(1.01)" }}
      />
      <div
        className="relative w-full h-full bg-black font-mono text-base text-white flex flex-col"
        style={{ clipPath }}
      >
        <span className="text-green-400 font-bold text-sm font-mono pt-1 z-10 border-b-2 border-green-400 block pl-4">
          {title}
        </span>
        <div className="flex flex-row flex-1 min-h-0 w-full">
          <div className="relative flex items-center justify-center h-full w-full">
            <Image
              src={image}
              alt="Signal"
              fill
              unoptimized={image.endsWith(".gif")}
              className="object-cover"
              priority={true}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignalCard;
