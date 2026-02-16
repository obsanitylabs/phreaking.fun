import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useTutorialStore } from "@/stores";
import Button from "@/components/ui/button";

interface TutorialOverlayProps {
  onClose?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onClose }) => {
  const tutorialState = useTutorialStore();
  const { nextStep, skipTutorial } = useTutorialStore();
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);

  const currentStep = tutorialState.steps[tutorialState.currentStep];

  const findTargetElement = React.useCallback(() => {
    if (!currentStep || tutorialState.currentStep !== 1) return;

    const element = document.querySelector(currentStep.target) as HTMLElement;
    if (element) {
      setTargetElement(element);
    } else {
      setTargetElement(null);
    }
  }, [currentStep, tutorialState.currentStep]);

  useEffect(() => {
    if (!tutorialState.isActive || tutorialState.currentStep !== 1) return;

    findTargetElement();

    observerRef.current = new MutationObserver(() => {
      findTargetElement();
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-testid', 'class', 'id']
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [findTargetElement, tutorialState.isActive, tutorialState.currentStep]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      skipTutorial();
    }
  };

  if (!tutorialState.isActive || !currentStep) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
      >
        {tutorialState.currentStep === 1 && targetElement ? (
          <div 
            className="absolute inset-0 pointer-events-auto"
            style={{
              background: 'rgba(0,0,0,0.8)',
              clipPath: `polygon(
                0% 0%, 
                0% 100%, 
                ${targetElement.getBoundingClientRect().left - 5}px 100%, 
                ${targetElement.getBoundingClientRect().left - 5}px ${targetElement.getBoundingClientRect().top - 5}px, 
                ${targetElement.getBoundingClientRect().left + targetElement.getBoundingClientRect().width + 5}px ${targetElement.getBoundingClientRect().top - 5}px, 
                ${targetElement.getBoundingClientRect().left + targetElement.getBoundingClientRect().width + 5}px ${targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height + 5}px, 
                ${targetElement.getBoundingClientRect().left - 5}px ${targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height + 5}px, 
                ${targetElement.getBoundingClientRect().left - 5}px 100%, 
                100% 100%, 
                100% 0%
              )`
            }}
            onClick={handleOverlayClick}
          />
        ) : (
          <div className="absolute inset-0 bg-black/80 pointer-events-auto" onClick={handleOverlayClick} />
        )}
        
        {targetElement && tutorialState.currentStep === 1 && (
          <motion.div
            className="absolute pointer-events-none border border-terminal-green rounded-lg"
            style={{
              left: targetElement.getBoundingClientRect().left + window.pageXOffset - 4,
              top: targetElement.getBoundingClientRect().top + window.pageYOffset - 4,
              width: targetElement.getBoundingClientRect().width + 8,
              height: targetElement.getBoundingClientRect().height + 8,
              zIndex: 9999,
            }}
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.6, 0.9, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}

        {/* Tutorial tooltip */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed inset-0 flex items-center justify-center p-4 z-[10001] pointer-events-none"
        >
          <div
            className="bg-terminal-black border-2 border-terminal-green font-mono text-terminal-green max-w-md w-full pointer-events-auto"
            style={{
              clipPath: 'polygon(15px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 15px)',
            }}
          >
          <div className="p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-terminal-green-light">
                TUTORIAL {tutorialState.currentStep + 1}/{tutorialState.steps.length}
              </div>
              <button
                onClick={skipTutorial}
                className="text-terminal-green-dark hover:text-terminal-green transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-terminal-green">
                {currentStep.title}
              </h3>
              <p className="text-sm text-terminal-white leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-terminal-green-dark">
                <span>Progress</span>
                <span>{Math.round((tutorialState.currentStep / tutorialState.steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-terminal-gray-dark rounded-full h-1">
                <motion.div
                  className="bg-terminal-green h-1 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(tutorialState.currentStep / tutorialState.steps.length) * 100}%` 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-center pt-2">
              <Button
                value={tutorialState.currentStep === tutorialState.steps.length - 1 ? "Finish" : "Next"}
                variant="primary"
                onClick={nextStep}
                className="!py-2 !text-sm !px-8"
                text="center"
              />
            </div>
          </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
