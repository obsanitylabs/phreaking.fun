import { useState, useEffect } from 'react';

interface ImagePreloaderState {
  loaded: number;
  total: number;
  isLoading: boolean;
  isComplete: boolean;
  progress: number;
}

const imageUrls = [
  '/boxes/whiteBox.svg',
  '/boxes/blueBox.svg',
  '/boxes/silverBox.svg',
  '/boxes/greenBox.svg',
  '/boxes/blackBox.svg',
  '/boxes/rainbowBox.svg',
  '/boxes/goldBox.svg',
  '/boxes/diamondBox.svg',
  '/boxes/redBox.svg',
  
  '/signal.gif',
  '/globe.gif',
  '/graphic.svg',
  '/logo.svg',
  '/trophy.svg',
  '/tokens/usdt.svg',
  
  '/frameReceipt-left.svg',
  '/frameReceipt-right.svg',
  '/frameInformation.svg',
  '/frameBox-left.svg',
  '/frameBox-right.svg',
  '/frame-left.svg',
  '/frame-right.svg',
  '/frame-left-orange.svg',
  '/frame-right-orange.svg',
  
  '/phreakingButton1.svg',
  '/phreakingButton2.svg',
  '/finishButton.svg',
  
  '/processingAnimation.svg',
  '/check.svg',
  '/crown.svg',
  '/backArrow.svg',
  '/collapsible.svg',
  '/folder.svg',
  '/code-one.svg',
  '/code-one-O.svg',
  '/code-one.png',
  '/assets/solana.svg',
];

export const useImagePreloader = () => {
  const [state, setState] = useState<ImagePreloaderState>({
    loaded: 0,
    total: 0,
    isLoading: true,
    isComplete: false,
    progress: 0,
  });

  useEffect(() => {
    const preloadImages = async () => {
      setState(prev => ({ ...prev, total: imageUrls.length, isLoading: true }));
      
      let loadedCount = 0;
      
      const loadImage = (url: string): Promise<void> => {
        return new Promise((resolve) => {
          const img = new Image();
          
          img.onload = () => {
            loadedCount++;
            setState(prev => ({
              ...prev,
              loaded: loadedCount,
              progress: Math.round((loadedCount / imageUrls.length) * 100),
            }));
            resolve();
          };
          
          img.onerror = () => {
            loadedCount++;
            setState(prev => ({
              ...prev,
              loaded: loadedCount,
              progress: Math.round((loadedCount / imageUrls.length) * 100),
            }));
            resolve();
          };
          
          img.src = url;
        });
      };

      try {
        const batchSize = 5;
        for (let i = 0; i < imageUrls.length; i += batchSize) {
          const batch = imageUrls.slice(i, i + batchSize);
          await Promise.all(batch.map(loadImage));
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setState(prev => ({
          ...prev,
          isLoading: false,
          isComplete: true,
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isComplete: true,
        }));
      }
    };

    preloadImages();
  }, []);

  return state;
}; 