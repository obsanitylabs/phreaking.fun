"use client";
import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  id: string;
  onClose: () => void;
}

const Modal = ({ id, onClose }: ModalProps) => {
  const getModalContent = () => {
    switch (id) {
      case "1":
        return {
          title: "ASSETS",
          content: "Asset content goes here",
        };
      case "2":
        return {
          title: "INFORMATION",
          content: "Information content goes here",
        };
      case "3":
        return {
          title: "TOP WINNERS",
          content: "Top winners content goes here",
        };
      case "4":
        return {
          title: "LIVE GAME",
          content: "Live game content goes here",
        };
      default:
        return {
          title: "Unknown",
          content: "Content not available",
        };
    }
  };

  const { title, content } = getModalContent();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop with fade-in animation */}
      <div
        className="fixed inset-0 bg-terminal-black/80 animate-fadeIn"
        onClick={onClose}
      ></div>

      {/* Modal container with slide-in animation */}
      <div className="bg-terminal-black border-2 border-terminal-green p-5 z-10 w-full mx-4 animate-slideIn">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-terminal-green font-mono text-lg">{title}</h3>
          <button
            onClick={onClose}
            className="text-terminal-green hover:text-terminal-white p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="text-terminal-white font-mono">{content}</div>
      </div>
    </div>
  );
};

export default Modal;
