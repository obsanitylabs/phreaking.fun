import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute z-50 pointer-events-none transition-all duration-300",
    left: "left-1/2 -translate-x-[calc(65px+100px)]",
    right: "right-1/2 translate-x-[calc(65px+100px)]",
    image: "h-[365px] w-auto",
  },
} as const;

interface FrameXProps {
  position: "left" | "right";
  orange?: boolean;
}

const FrameXReceiptModal: React.FC<FrameXProps> = ({ position }) => (
  <div
    className={`${styles.frame.base} ${position === "left" ? styles.frame.left : styles.frame.right}`}
  >
    <Image
      src={`/frameBox-${position}.svg`}
      alt={`frame ${position}`}
      width={48}
      height={2}
      className={styles.frame.image}
    />
  </div>
);

export default FrameXReceiptModal;
