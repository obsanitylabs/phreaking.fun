"use client";
import React, { useState, useEffect } from "react";

interface TextEncryptedProps {
  text: string;
  interval?: number;
  isAnimating?: boolean;
  textColor?: string;
  isResolving?: boolean;
}

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789?";

export const TextEncrypted: React.FC<TextEncryptedProps> = ({
  text,
  interval = 50,
  isAnimating = true,
  textColor = "text-white",
  isResolving = false,
}) => {
  const [displayText, setDisplayText] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [resolvedChars, setResolvedChars] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isResolving) {
      timer = setInterval(() => {
        if (resolvedChars < text.length) {
          const resolvedPart = text.slice(0, resolvedChars + 1);
          const scrambledPart = text
            .slice(resolvedChars + 1)
            .split("")
            .map((char) => {
              if (char === "." || char === "x") {
                return char;
              }
              return chars[Math.floor(Math.random() * chars.length)];
            })
            .join("");
          
          setDisplayText(resolvedPart + scrambledPart);
          setResolvedChars(prev => prev + 1);
        } else {
          setDisplayText(text);
          clearInterval(timer);
        }
      }, interval * 2); 
    } else if (isAnimating) {
      setResolvedChars(0);
      timer = setInterval(() => {
        const scrambledText = text
          .split("")
          .map((char) => {
            if (char === "." || char === "x") {
              return char;
            }
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("");
        setDisplayText(scrambledText);
      }, interval);
    } else {
      setDisplayText(text);
      setResolvedChars(text.length);
    }

    return () => clearInterval(timer);
  }, [text, interval, isAnimating, isResolving, resolvedChars]);

  if (!isMounted) {
    return <span> </span>;
  }

  return (
    <span className={`${textColor} font-mono`}>
      {displayText}
    </span>
  );
};
