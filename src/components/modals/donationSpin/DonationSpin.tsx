"use client";
import React, { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { ProgressBar } from "@/components/ui/progressBar";
import Button from "@/components/ui/button";
import FrameSpinModal from "./FrameSpinModal";
import { TextEncrypted } from "@/components/ui/TextEncrypted";

interface DonationSpinProps {
  isOpen: boolean;
  onClose: () => void;
  onSpin: (selectedId?: number) => void;
  selectedId?: number;
}

export default function DonationSpin({
  isOpen,
  onClose,
  onSpin,
  selectedId,
}: DonationSpinProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRotation, setSpinRotation] = useState(0);
  const [currentInstitutionId, setCurrentInstitutionId] = useState(1);
  const [spinCompleted, setSpinCompleted] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isAnimatingSelection, setIsAnimatingSelection] = useState(false);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [targetInstitutionId, setTargetInstitutionId] = useState<number | null>(null);

  const institutions: Record<number, { name: string; wallet: string }> = {
    1: { name: "ZachXBT", wallet: "0x532FD5...2ED1BB4F" },
    2: { name: "Electronic Frontier Foundation", wallet: "0x742AB3...8FC2D91A" },
    3: { name: "Internet Archive", wallet: "0x8D4C7E...5A9B2F6C" },
    4: { name: "Tor Project", wallet: "0x9F5E2A...3D7C8B1E" },
    5: { name: "Unbound Science Foundation", wallet: "0xA8B6D4...7E1F9C3A" },
    6: { name: "Desci Foundation", wallet: "0xB9C7F2...4A6E8D5B" }
  };

  const cycleInstitutions = () => {
    let cycleCount = 0;
    const maxCycles = 35;
    
    const cycle = () => {
      if (cycleCount < maxCycles && isSpinning) {
        const nextId = (currentInstitutionId % 6) + 1;
        setCurrentInstitutionId(nextId);
        
        cycleCount++;
        const delay = 150;
        setTimeout(cycle, delay);
      }
    };
    
    cycle();
  };

  const handleWheelClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSpinning || !isSelecting || isAnimatingSelection) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const clickX = event.clientX - rect.left - centerX;
    const clickY = event.clientY - rect.top - centerY;
    
    const angleRad = Math.atan2(clickY, clickX);
    let angleDeg = angleRad * (180 / Math.PI);
    
    angleDeg = (angleDeg + 90 + 360) % 360;
    
    angleDeg = (angleDeg + 90) % 360;
    
    const sectionAngle = 60;
    const sectionIndex = Math.floor(angleDeg / sectionAngle);
    
    const animationInstitutionId = sectionIndex + 1; 
    selectInstitution(animationInstitutionId);
  };

  const handleWheelHover = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isSpinning || !isSelecting || isAnimatingSelection) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const hoverX = event.clientX - rect.left - centerX;
    const hoverY = event.clientY - rect.top - centerY;
    
    const angleRad = Math.atan2(hoverY, hoverX);
    let angleDeg = angleRad * (180 / Math.PI);
    angleDeg = (angleDeg + 90 + 360) % 360;
    
    angleDeg = (angleDeg + 90) % 360;
    
    const sectionAngle = 60;
    const sectionIndex = Math.floor(angleDeg / sectionAngle);
    
    setHoveredSection(sectionIndex);
  };

  const handleWheelLeave = () => {
    setHoveredSection(null);
  };

  const renderSectionOverlay = (sectionIndex: number, color: string, opacity: number = 0.3) => {
    const startAngle = sectionIndex * 60 - 30;
    const endAngle = (sectionIndex + 1) * 60 - 30;
    
    const startRad = (startAngle - 90 - 60) * (Math.PI / 180);
    const endRad = (endAngle - 90 - 60) * (Math.PI / 180);
    
    const radius = 142; 
    const centerX = 200; 
    const centerY = 200; 
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 0 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');
    
    return (
      <svg
        key={`section-${sectionIndex}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 400 400"
        style={{ zIndex: 3 }}
      >
        <path
          d={pathData}
          fill={color}
          opacity={opacity}
          stroke={color}
          strokeWidth="2"
        />
      </svg>
    );
  };

  const selectInstitution = (institutionId: number) => {
    if (isSpinning || isAnimatingSelection) return;
    
    setIsSelecting(false);
    setIsAnimatingSelection(true);
    
    const institutionCenterAngle = (institutionId - 1) * 60; 
    const targetAngle = -institutionCenterAngle + 60; 
    
    const fullRotation = -360; 
    const totalRotation = fullRotation + targetAngle;
    

    
    setSpinRotation(totalRotation);
    
    const finalInstitutionId = institutionId === 1 ? 6 : institutionId - 1;
    setCurrentInstitutionId(finalInstitutionId);
    
    setTimeout(() => {
      setIsAnimatingSelection(false);
      setSpinCompleted(true);
    }, 1500); 
  };

  const handleSelect = () => {
    if (isSpinning) return;
    
    setIsSelecting(true);
    setSpinCompleted(false); 
    
  };

  if (!isOpen) return null;

  const handleSpin = () => {
    if (isSpinning) return; 
    
    try {
      setIsSpinning(true);
      setIsResolving(false);
      
      const targetId = selectedId || Math.floor(Math.random() * 6) + 1;
      setTargetInstitutionId(targetId); // Armazena a instituição final
      
      const institutionAngles = {
        1: 0,   // ZachXBT
        2: 60,  // Electronic Frontier Foundation  
        3: 120, // Internet Archive
        4: 180, // Tor Project
        5: 240, // Unbound Science Foundation
        6: 300  // Desci Foundation
      };
      
      const targetAngle = -(institutionAngles[targetId as keyof typeof institutionAngles] || 0);
      const fullRotations = 5; 
      const totalRotation = fullRotations * 360 + targetAngle;
      
      setSpinRotation(totalRotation);
      
      setTimeout(() => {
        cycleInstitutions();
      }, 500);
      
      setTimeout(() => {
        setIsResolving(true);
        setCurrentInstitutionId(targetId); 
      }, 6000);
      
      setTimeout(() => {
        try {
          setIsSpinning(false);
          setIsResolving(false);
          setSpinCompleted(true);
          setCurrentInstitutionId(targetId);

        } catch {
          setIsSpinning(false);
          setIsResolving(false);
        }
      }, 7000);
    } catch {
      setIsSpinning(false);
      setIsResolving(false);
    }
  };

  const handleDone = () => {
    try {
      if (typeof onSpin === 'function') {
        onSpin(currentInstitutionId);
      }
    } catch {
      // Handle error silently
    }
  };

  return (
    <div className="fixed inset-0 bg-terminal-black/80 z-[9999] flex items-center justify-center p-4">
      <div 
        className="rounded-lg flex flex-col relative shadow-2xl backdrop-blur-md z-[1] h-full w-full"
        style={{ 
          width: '80vw', 
          height: '80vh',
          maxWidth: '1200px',
          maxHeight: '800px',
          minWidth: '600px',
          minHeight: '500px'
        }}
      >

        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 flex items-center gap-2 group z-[9999] p-2 rounded-md hover:bg-terminal-black/70 transition-colors"
        >
          <span className="text-terminal-gray-light font-bold text-sm group-hover:underline flex justify-center items-center gap-2">
            EXIT
          <X
            size={16}
            className="text-white transition-colors hover:text-terminal-green-light flex-shrink-0"
          />
          </span>
        </button>

        <div className="flex-shrink-0 text-center pt-12 md:pt-16 pb-4">
          <div className="text-white text-[29px] tracking-widest font-bold">
            SPIN THE WHEEL
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
          
          <div className="relative flex items-center justify-center ">
            <div 
              className={`relative w-[400px] h-[400px] ${
                isSelecting ? 'cursor-pointer' : ''
              }`}
              onClick={handleWheelClick}
              onMouseMove={handleWheelHover}
              onMouseLeave={handleWheelLeave}
            >
            <svg 
              className="absolute pointer-events-none"
              style={{ 
                width: '450px', 
                height: '450px',
                left: 'calc(50% - 225px)',
                top: 'calc(50% - 225px)',
                zIndex: 0
              }}
              viewBox="0 0 450 450"
            >
              <defs>
                <linearGradient id="circleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: 'rgba(0, 255, 136, 0)', stopOpacity: 0}} />
                  <stop offset="50%" style={{stopColor: 'rgba(0, 255, 136, 0.1)', stopOpacity: 0.4}} />
                  <stop offset="100%" style={{stopColor: 'rgba(0, 255, 136, 0.4)', stopOpacity: 0.5}} />
                </linearGradient>
              </defs>
              
              <circle
                cx="225"
                cy="225"
                r="175"
                fill="none"
                stroke="url(#circleGradient)"
                strokeWidth="10"
              />
              
              <circle
                cx="225"
                cy="225"
                r="170"
                fill="none"
                stroke="rgba(0, 255, 136, 0.3)"
                strokeWidth="1"
              />
            </svg>
            
            <Image
              src="/spin/spin.svg"
              alt="Spin Wheel Base"
              fill
              className="object-contain"
              style={{ zIndex: 1 }}
            />
            
            <Image
              src="/spin/spinIntens.png"
              alt="Spin Wheel Items"
              fill
              className={`object-contain transition-all ${
                isSpinning ? 'ease-out' : 'ease-in-out'
              } ${isSelecting ? 'hover:brightness-110' : ''}`}
              style={{
                transform: `rotate(${spinRotation}deg) scale(2.1)`,
                transformOrigin: 'center center',
                transition: isSpinning 
                  ? 'transform 7s ease-out' 
                  : isAnimatingSelection 
                    ? 'transform 1.5s cubic-bezier(0.25, 0.1, 0.25, 1), brightness 0.2s ease-in-out' 
                    : isSelecting 
                      ? 'transform 0.3s ease-in-out, brightness 0.2s ease-in-out' 
                      : 'transform 0.2s ease-in-out',
              }}
            />

            <FrameSpinModal position="left" />
            <FrameSpinModal position="right" />            
            {isSelecting && hoveredSection !== null && (
              renderSectionOverlay(hoveredSection, '#00ff88', 0.2)
            )}
          </div>
        </div>

        <div className="w-[230px] max-w-full mb-4">
          <ProgressBar animationType="center" />
        </div>

        <div className="text-center mb-6 px-4">
          {isSelecting ? (
            <div>
              <h3 className="font-mono text-[18px] font-bold text-terminal-green-light animate-pulse">
                CLICK ON THE WHEEL TO SELECT
              </h3>
              <p className="font-mono text-sm mt-2 text-terminal-gray-light">
                Choose your preferred institution
              </p>
            </div>
          ) : (
            <div>
              <h3 className="font-mono text-[18px] font-bold text-white transition-all duration-150 break-words">
                {isSpinning ? (
                  <TextEncrypted 
                    text={
                      isResolving && targetInstitutionId 
                        ? institutions[targetInstitutionId]?.name || "Unbound Science Foundation"
                        : institutions[currentInstitutionId]?.name || "Unbound Science Foundation"
                    } 
                    interval={100}
                    isAnimating={isSpinning && !isResolving}
                    isResolving={isResolving}
                  />
                ) : (
                  institutions[currentInstitutionId]?.name || "Unbound Science Foundation"
                )}
              </h3>
              <p className="font-mono text-lg mt-2 text-terminal-green-dark break-all">
                {isSpinning ? (
                  <TextEncrypted 
                    text={
                      isResolving && targetInstitutionId 
                        ? institutions[targetInstitutionId]?.wallet || "0x532FD5...2ED1BB4F"
                        : institutions[currentInstitutionId]?.wallet || "0x532FD5...2ED1BB4F"
                    } 
                    interval={80}
                    isAnimating={isSpinning && !isResolving}
                    isResolving={isResolving}
                    textColor="text-terminal-green-dark"
                  />
                ) : (
                  institutions[currentInstitutionId]?.wallet || "0x532FD5...2ED1BB4F"
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 flex gap-4 sm:gap-8 justify-center pb-8 px-4">
        {!spinCompleted ? (
          <>
            {isSelecting ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setIsSelecting(false);
                  setHoveredSection(null);
                }}
                disabled={isSpinning || isAnimatingSelection}
                className="min-w-[120px] sm:min-w-[150px] text-base sm:text-lg"
                value="[Cancel]"
                text="center"
              />
            ) : (
              <Button
                variant="secondary"
                onClick={handleSelect}
                disabled={isSpinning || isAnimatingSelection}
                className="min-w-[120px] sm:min-w-[150px] text-base sm:text-lg"
                value="[Select]"
                text="center"
              />
            )}
            <Button
              variant="primary"
              onClick={handleSpin}
              disabled={isSpinning || isSelecting || isAnimatingSelection}
              className="min-w-[120px] sm:min-w-[150px] text-base sm:text-lg"
              value={isSpinning ? "[Spinning...]" : isAnimatingSelection ? "[Selecting...]" : "[Spin]"}
              text="center"
            />
          </>
        ) : (
          <Button
            variant="primary"
            onClick={handleDone}
            className="min-w-[200px] sm:min-w-[200px] text-base sm:text-lg"
            value="[Done]"
            text="center"
          />
        )}
      </div>
    </div>
  </div>
);
}
