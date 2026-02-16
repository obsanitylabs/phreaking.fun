import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute z-50 pointer-events-none transition-all duration-300",
    left: "left-1/2 -translate-x-[calc(380px+100px)]",
    right: "right-1/2 translate-x-[calc(400px+100px)]",
    image: "h-[540px] w-auto",
  },
} as const;

interface FrameProps {
  position: "left" | "right";
  orange?: boolean;
  red?: boolean;
}

const FrameMysteryBox: React.FC<FrameProps> = ({ position, orange, red }) => {
  const getFrameImage = () => {
    if (red) return `/frame-${position}-red.svg`;
    if (orange) return `/frame-${position}-orange.svg`;
    return `/frame-${position}.svg`;
  };

  return (
    <div
      className={`${styles.frame.base} ${position === "left" ? styles.frame.left : styles.frame.right}`}
    >
      <Image
        src={getFrameImage()}
        alt={`frame ${position}`}
        width={48}
        height={480}
        className={styles.frame.image}
      />
    </div>
  );
};

export default FrameMysteryBox;
