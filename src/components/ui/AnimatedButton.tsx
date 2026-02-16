import React, { useEffect, useState } from "react";
import Image from "next/image";

interface AnimatedButtonProps {
  bottom?: string;
}

const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  bottom = "-120px",
}) => {
  const [currentButton, setCurrentButton] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentButton((prev) => (prev === 1 ? 2 : 1));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom,
        transform: "translateX(-50%)",
        zIndex: 60,
      }}
    >
      <div style={{ position: "relative", width: 260, height: 60 }}>
        <Image
          src="/phreakingButton1.svg"
          alt="Phreaking Button"
          width={260}
          height={60}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transition: "opacity 1.2s ease-in-out",
            opacity: currentButton === 1 ? 1 : 0,
            filter: "drop-shadow(0 0 8px rgba(253, 156, 38, 0.3))",
          }}
        />
        <Image
          src="/phreakingButton2.svg"
          alt="Phreaking Button"
          width={260}
          height={60}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            transition: "opacity 1.2s ease-in-out",
            opacity: currentButton === 2 ? 1 : 0,
            filter: "drop-shadow(0 0 8px rgba(253, 156, 38, 0.3))",
          }}
        />
      </div>
    </div>
  );
};

export default AnimatedButton;
