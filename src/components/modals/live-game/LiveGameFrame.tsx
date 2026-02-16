import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute z-50 pointer-events-none transition-all duration-300",
    left: "left-1/2 -translate-x-[440px]",
    right: "right-1/2 translate-x-[440px]",
    image: "h-[540px] w-auto",
  },
} as const;

interface FrameProps {
  position: "left" | "right";
}

const LiveGameFrame: React.FC<FrameProps> = ({ position }) => (
  <div
    className={`${styles.frame.base} ${position === "left" ? styles.frame.left : styles.frame.right}`}
  >
    <Image
      src={`/frame-${position}.svg`}
      alt={`frame ${position}`}
      width={48}
      height={480}
      className={styles.frame.image}
    />
  </div>
);

export default LiveGameFrame;
