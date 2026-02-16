import React from "react";
import Image from "next/image";

interface FinishButtonProps {
  bottom?: string;
  onClick?: () => void;
}

const FinishButton: React.FC<FinishButtonProps> = ({
  bottom = "-120px",
  onClick,
}) => {
  return (
    <div
      className="absolute left-1/2 z-[60] cursor-pointer"
      style={{ bottom, transform: "translateX(-50%)" }}
      onClick={onClick}
    >
      <div className="relative w-[260px] h-[60px]">
        <Image
          src="/finishButton.svg"
          alt="Finish Button"
          width={260}
          height={60}
          className="absolute top-0 left-0 "
        />
      </div>
    </div>
  );
};

export default FinishButton;
