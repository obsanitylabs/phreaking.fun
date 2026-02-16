import React from "react";
import Image from "next/image";

interface ErrorButtonProps {
  bottom?: string;
  onClick?: () => void;
}

const ErrorButton: React.FC<ErrorButtonProps> = ({
  bottom = "-120px",
  onClick,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom,
        transform: "translateX(-50%)",
        zIndex: 60,
        cursor: onClick ? "pointer" : "default",
      }}
      onClick={onClick}
    >
      <div style={{ position: "relative", width: 260, height: 60 }}>
        <Image
          src="/errorButton.svg"
          alt="Error Button"
          width={260}
          height={60}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            filter: "drop-shadow(0 0 8px rgba(239, 68, 68, 0.3))",
          }}
        />
      </div>
    </div>
  );
};

export default ErrorButton;
