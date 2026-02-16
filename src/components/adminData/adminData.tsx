"use client";
import React, { useState } from "react";
import Image from "next/image";
import AssetsModal from "@/components/modals/assets/AssetsModal";
import InformationModal from "@/components/modals/information/InformationModal";
import LiveGameModal from "../modals/live-game/LiveGameModal";
import TopWinnersModal from "../modals/top-winners/TopWinners";

const AdminData = () => {
  const [collapsed, setCollapsed] = useState(true);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // const toggleCollapsed = () => setCollapsed(!collapsed);
  const toggleCollapsed = () => setCollapsed(true);

  const openModal = (id: string) => {
    setActiveModal(id);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  return (
    <div className="relative w-full bg-terminal-black border border-terminal-green font-mono text-base text-terminal-white px-6 py-8 flex flex-col justify-center h-full">
      <span className="absolute top-0 left-0 w-4 h-4 z-10">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polygon points="0,0 16,0 0,16" fill="#22e584" />
        </svg>
      </span>
      <span className="absolute bottom-0 right-0 w-4 h-4 z-10">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <polygon points="16,16 0,16 16,0" fill="#22e584" />
        </svg>
      </span>

      <h2 className="text-terminal-green mb-4">Administrator data</h2>
      <div className="flex cursor-pointer" onClick={toggleCollapsed}>
        <Image
          src="/collapsible.svg"
          alt="collapsible"
          width={12}
          height={12}
          style={{ width: 'auto', height: 'auto' }}
          className={`transition-transform duration-200`}
        />
      </div>
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 transition-all duration-300 ${collapsed ? "opacity-0 -translate-y-2 pointer-events-none" : "opacity-100 translate-y-0 pointer-events-auto"}`}
      >
        <nav className="flex flex-col gap-4 min-w-[150px] ml-2 md:ml-6">
          <button
            className="flex items-center whitespace-nowrap cursor-not-allowed"
            disabled
          >
            <Image
              src="/folder.svg"
              alt="Folder"
              width={14}
              height={12}
              style={{ width: 'auto', height: 'auto' }}
              className="mr-2 opacity-50"
            />
            <span>ASSETS</span>
          </button>
          <button
            className="flex items-center whitespace-nowrap cursor-not-allowed"
            disabled
          >
            <Image
              src="/folder.svg"
              alt="Folder"
              width={14}
              height={12}
              style={{ width: 'auto', height: 'auto' }}
              className="mr-2 opacity-50"
            />
            <span>INFORMATION</span>
          </button>
        </nav>

        <nav className="flex flex-col gap-4">
          <button
            className="flex items-center whitespace-nowrap cursor-not-allowed"
            disabled
          >
            <Image
              src="/folder.svg"
              alt="Folder"
              width={14}
              height={12}
              style={{ width: 'auto', height: 'auto' }}
              className="mr-2 opacity-50"
            />
            <span>TOP WINNERS</span>
          </button>
          <button
            className="flex items-center whitespace-nowrap cursor-not-allowed"
            disabled
          >
            <Image
              src="/folder.svg"
              alt="Folder"
              width={14}
              height={12}
              style={{ width: 'auto', height: 'auto' }}
              className="mr-2 opacity-50"
            />
            <span>LIVE GAME</span>
          </button>
        </nav>
      </div>

      {activeModal === "assets" && <AssetsModal onClose={closeModal} />}
      {activeModal === "information" && (
        <InformationModal onClose={closeModal} />
      )}
      {activeModal === "live-game" && <LiveGameModal onClose={closeModal} />}
      {activeModal === "top-winners" && (
        <TopWinnersModal onClose={closeModal} />
      )}
    </div>
  );
};

export default AdminData;
