import React, { useState } from "react";
import { ChevronsRight } from "lucide-react";
import { motion, useMotionValue, PanInfo } from "framer-motion";

interface SliderButtonProps {
  text?: string;
  center?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  isSwiped: boolean;
  onSwipeChange: (isSwiped: boolean) => void;
  'data-testid'?: string;
}

export default function SliderButton({
  onClick,
  text,
  center,
  disabled = false,
  isSwiped,
  onSwipeChange,
  'data-testid': testId,
}: SliderButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [handleWidth, setHandleWidth] = useState(0);
  const [currentX, setCurrentX] = useState(0);

  React.useEffect(() => {
    const updateDimensions = () => {
      if (sliderRef.current) {
        const slider = sliderRef.current;
        const handle = slider.querySelector(".handle") as HTMLElement;
        if (handle) {
          setSliderWidth(slider.offsetWidth);
          setHandleWidth(handle.offsetWidth);
        }
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  React.useEffect(() => {
    if (!isSwiped) {
      x.set(0);
    }
  }, [isSwiped, x]);

  React.useEffect(() => {
    const unsubscribe = x.onChange((latest) => {
      setCurrentX(latest);
    });
    return () => unsubscribe();
  }, [x]);

  const maxDrag = sliderWidth - handleWidth;
  const isAlmostSwiped = currentX >= maxDrag * 0.9;
  const displayText = isSwiped
    ? "[Swiped]"
    : isAlmostSwiped
      ? "[Swiped]"
      : text;

  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    setIsDragging(false);
    const threshold = maxDrag * 0.8;

    if (info.offset.x >= threshold) {
      x.set(maxDrag);
      onSwipeChange(true);
      onClick?.();
    } else {
      x.set(0);
      onSwipeChange(false);
    }
  };

  const clipPath =
    "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)";
  const handleClipPath = isSwiped
    ? "polygon(0% 0%, calc(100% - 10px) 0%, 100% 10px, 100% 100%, 10px 100%, 0% calc(100% - 10px))"
    : clipPath;

  return (
    <div
      ref={sliderRef}
      className="w-full h-10 relative select-none"
      style={{ clipPath }}
      data-testid={testId}
    >
      <motion.div
        className={`absolute inset-0 font-mono text-sm border border-terminal-green flex items-center z-0
          ${isSwiped || isAlmostSwiped ? "justify-center bg-terminal-green text-black font-bold" : isDragging ? "justify-start pl-4 bg-terminal-black text-white" : center ? "justify-center bg-terminal-black text-white" : "justify-end pr-4 bg-terminal-black text-white"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          transition-colors duration-300`}
        style={{ clipPath }}
      >
        {displayText}
      </motion.div>

      <motion.div
        className={`handle absolute top-[-4px] h-12 w-[60px] flex items-center justify-center border-2 border-black text-terminal-black font-bold z-10
          ${isSwiped ? "bg-terminal-green cursor-default" : disabled ? "bg-terminal-gray cursor-not-allowed" : "bg-terminal-green cursor-grab active:cursor-grabbing"}`}
        style={{
          x,
          clipPath: handleClipPath,
          left: 0,
        }}
        drag={!isSwiped && !disabled ? "x" : false}
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        animate={{
          x: isSwiped ? maxDrag : 0,
          transition: { type: "spring", stiffness: 300, damping: 30 },
        }}
      >
        <ChevronsRight size={20} />
      </motion.div>
    </div>
  );
}
