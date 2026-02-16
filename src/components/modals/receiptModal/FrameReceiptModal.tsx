import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute top-[-25px] bottom-[-25px] z-50 pointer-events-none transition-all duration-300",
    left: "left-[-25px]",
    right: "right-[-25px]",
    image: "h-full w-auto",
  },
} as const;

interface FrameReceiptModalProps {
  position: "left" | "right";
  orange?: boolean;
}

const FrameReceiptModal: React.FC<FrameReceiptModalProps> = ({ position }) => {
  const dimensions = {
    left: { width: 800, height: 604 },
    right: { width: 473, height: 508 },
  };

  return (
    <div className={`${styles.frame.base} ${styles.frame[position]}`}>
      <Image
        src={`/frameReceipt-${position}.svg`}
        alt={`frame ${position}`}
        width={dimensions[position].width}
        height={dimensions[position].height}
        className={styles.frame.image}
        priority
      />
    </div>
  );
};

export default FrameReceiptModal;
