"use client";
import React from 'react';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { SplashScreen } from './SplashScreen';
import { useSplashScreen } from '@/contexts/SplashScreenContext';

interface AppLoaderProps {
  children: React.ReactNode;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ children }) => {
  const { progress, isComplete } = useImagePreloader();
  const { showSplashScreen, hideSplashScreen } = useSplashScreen();

  if (showSplashScreen) {
    return (
      <SplashScreen
        progress={progress}
        isComplete={isComplete}
        onComplete={hideSplashScreen}
      />
    );
  }

  return <>{children}</>;
}; 