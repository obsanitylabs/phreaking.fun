import React from "react";
import Image from "next/image";

interface StatusCardProps {
  title: string;
  image1: string;
  image2?: string;
  color?: string;
}

const clipPath =
  "polygon(15px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 15px)";

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  image1,
  image2,
  color,
}) => {
  const mainColor =
    color || (image2 ? "var(--terminal-green, #22e584)" : "#4ade80");
  const borderColor = mainColor;
  const textColor = mainColor;
  const bgColor = image2 ? "var(--terminal-black, #000)" : "#000";

  return (
    <div className="relative w-full h-full group">
      <div
        className="absolute inset-0"
        style={{ background: mainColor, clipPath, transform: "scale(1.01)" }}
      />
      <div
        className="relative w-full h-full font-mono text-base flex flex-col"
        style={{ clipPath, background: bgColor }}
      >
        <span
          className="font-bold text-sm pt-1 z-10 border-b-2 block pl-4 tracking-widest uppercase"
          style={{ color: textColor, borderColor }}
        >
          {title}
        </span>
        <div className="flex flex-row flex-1 min-h-0 w-full">
          {image2 ? (
            <>
              <div
                className="relative w-1/2 h-full border-r"
                style={{ borderColor }}
              >
                <Image
                  src={image1}
                  alt="Image 1"
                  fill
                  unoptimized={image1.endsWith(".gif")}
                  className="object-contain"
                />
              </div>
              <div className="relative w-1/2 h-full">
                <Image
                  src={image2}
                  alt="Image 2"
                  fill
                  className="object-cover"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full w-full">
              <Image
                src={image1}
                alt="Signal"
                fill
                unoptimized={image1.endsWith(".gif")}
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatusCard;
