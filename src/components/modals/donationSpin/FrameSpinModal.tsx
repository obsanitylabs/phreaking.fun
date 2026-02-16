import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute z-50 pointer-events-none transition-all duration-300 top-1/2 -translate-y-1/2",
    left: "left-1/2 -translate-x-[calc(220px)]",
    right: "right-1/2 translate-x-[calc(220px)]",
    image: "h-[340px] w-auto",
  },
} as const;

interface FrameSpinProps {
  position: "left" | "right";
}

const FrameSpinModal: React.FC<FrameSpinProps> = ({ position }) => (
  <div
    className={`${styles.frame.base} ${position === "left" ? styles.frame.left : styles.frame.right}`}
  >
    <Image
      src={`/FrameSpin${position === "left" ? "L" : "R"}.svg`}
      alt={`frame spin ${position}`}
      width={28}
      height={280}
      className={styles.frame.image}
    />
  </div>
);

export default FrameSpinModal;
