"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface SplashScreenProps {
  progress: number;
  isComplete: boolean;
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  progress,
  isComplete,
  onComplete,
}) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (!isComplete) {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isComplete]);

  useEffect(() => {
    if (isComplete && progress === 100) {
      setShowCompleted(true);
      const timer = setTimeout(() => {
        onComplete();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, progress, onComplete]);

  const getProgressBar = () => {
    const filledBlocks = Math.floor((progress / 100) * 20);
    const emptyBlocks = 20 - filledBlocks;
    return '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);
  };

  const getLoadingMessage = () => {
    if (showCompleted) return 'SYSTEM READY';
    if (progress < 25) return `INITIALIZING PHREAKING BOXES${dots}`;
    if (progress < 50) return `LOADING ASSETS${dots}`;
    if (progress < 75) return `PREPARING INTERFACE${dots}`;
    if (progress < 100) return `FINALIZING${dots}`;
    return 'COMPLETED';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-terminal-black flex items-center justify-center font-mono"
      >
        <div className="text-center space-y-8 max-w-md w-full px-8">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <Image
                src="/phreaking_fun_logo.png"
                alt="Phreaking Fun"
                width={400}
                height={200}
                priority
                className="object-contain"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-6"
          >
            <div className="text-terminal-green text-sm tracking-wider h-6">
              {getLoadingMessage()}
            </div>

            <div className="space-y-2">
              <div className="text-terminal-green-dark text-xs text-left">
                LOADING: {progress}%
              </div>
              <div className="bg-terminal-black border border-terminal-green-dark p-2">
                <div className="text-terminal-green text-sm font-mono tracking-wider">
                  [{getProgressBar()}]
                </div>
              </div>
            </div>

            {!showCompleted && (
              <div className="space-y-1 text-xs text-terminal-green-dark">
                <div className="flex justify-between">
                  <span>► SYSTEM STATUS:</span>
                  <span className="text-terminal-green">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span>► NETWORK:</span>
                  <span className="text-terminal-green">CONNECTED</span>
                </div>
                <div className="flex justify-between">
                  <span>► ASSETS:</span>
                  <span className="text-terminal-green">
                    LOADING {Math.min(progress, 100)}%
                  </span>
                </div>
              </div>
            )}

            {showCompleted && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="space-y-2"
              >
                <div className="text-terminal-green text-lg tracking-widest">
                  ✓ LOADING COMPLETE
                </div>
                <div className="text-terminal-green-dark text-xs">
                  ENTERING PHREAKING FUN...
                </div>
              </motion.div>
            )}
          </motion.div>

          <motion.div
            className="absolute inset-4 border border-terminal-green opacity-20"
            style={{ clipPath: 'var(--clip-path-card)' }}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
          />
        </div>

        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="grid grid-cols-12 gap-1 h-full text-terminal-green text-xs">
            {Array.from({ length: 120 }, (_, i) => (
              <motion.div
                key={i}
                className="opacity-30"
                animate={{
                  opacity: [0.1, 0.5, 0.1],
                }}
                transition={{
                  duration: 2,
                  delay: (i * 0.1) % 2,
                  repeat: Infinity,
                }}
              >
                {i % 2 === 0 ? '1' : '0'}
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}; 