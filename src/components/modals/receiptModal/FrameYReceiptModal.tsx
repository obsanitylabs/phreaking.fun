import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute z-50 pointer-events-none transition-all duration-300",
    top: "top-1/2 -translate-y-[calc(255px+100px)]",
    bottom: "bottom-1/2 translate-y-[calc(255px+100px)]",
    image: "h-[340px] w-[130px]",
  },
} as const;

interface FrameYProps {
  position: "top" | "bottom";
  orange?: boolean;
}

const FrameYReceiptModal: React.FC<FrameYProps> = ({ position }) => (
  <div
    className={`${styles.frame.base} ${position === "top" ? styles.frame.top : styles.frame.bottom}`}
  >
    <Image
      src={`/frameBox-line.svg`}
      alt={`frame ${position}`}
      width={48}
      height={2}
      className={styles.frame.image}
    />
  </div>
);

export default FrameYReceiptModal;
