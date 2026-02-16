import React from "react";
import Image from "next/image";

const styles = {
  frame: {
    base: "absolute z-50 pointer-events-none transition-all duration-300 left-1/2 -translate-x-[384px]",
    text: "left-1/2 -translate-x-[268px] translate-y-[-24px]",
    image: "h-[200px] w-auto",
    textImage: "h-[35px] w-auto",
  },
} as const;

interface InformationFrameProps {
  position: "left" | "text";
}

const InformationFrame: React.FC<InformationFrameProps> = ({ position }) => (
  <div
    className={`${styles.frame.base} ${position === "left" ? styles.frame.base : styles.frame.text}`}
  >
    <Image
      src={`/frameInformation${position === "text" ? "Text" : ""}.svg`}
      alt={`frame information ${position}`}
      width={48}
      height={480}
      className={
        position === "text" ? styles.frame.textImage : styles.frame.image
      }
    />
  </div>
);

export default InformationFrame;
