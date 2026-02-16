"use client";
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SplashScreenContextType {
  showSplashScreen: boolean;
  hideSplashScreen: () => void;
}

const SplashScreenContext = createContext<SplashScreenContextType | undefined>(undefined);

interface SplashScreenProviderProps {
  children: ReactNode;
}

export const SplashScreenProvider: React.FC<SplashScreenProviderProps> = ({ children }) => {
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  const hideSplashScreen = () => {
    setShowSplashScreen(false);
  };

  return (
    <SplashScreenContext.Provider value={{ showSplashScreen, hideSplashScreen }}>
      {children}
    </SplashScreenContext.Provider>
  );
};

export const useSplashScreen = () => {
  const context = useContext(SplashScreenContext);
  if (context === undefined) {
    throw new Error('useSplashScreen must be used within a SplashScreenProvider');
  }
  return context;
}; 