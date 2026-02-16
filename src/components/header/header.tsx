"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import Button from "../ui/button";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { ChevronDown, Plus, HelpCircle } from "lucide-react";
import { useTutorialStore } from "@/stores";
import { HelpModal } from "@/components/ui/HelpModal";

const TypingLogo = () => {
  const fullText = "Phreaking Fun";
  const [displayText, setDisplayText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (isTyping && displayText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(fullText.substring(0, displayText.length + 1));
      }, 120);
      return () => clearTimeout(timeout);
    } else if (isTyping) {
      setIsTyping(false);
    }
  }, [displayText, isTyping, fullText]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-terminal-white font-medium text-[20px]">
      {displayText}
      <span
        className={`${cursorVisible ? "opacity-100" : "opacity-0"} transition-opacity duration-100`}
      >
        _
      </span>
    </span>
  );
};

export default function Header() {
  const { startTutorial, resetTutorial } = useTutorialStore();
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  return (
    <>
      <header className="w-full flex items-center justify-between py-4 px-8 bg-terminal-black border-b border-terminal-green font-mono text-terminal-green text-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-5 cursor-pointer">
          <Image
            src="/phreaking_fun_icon.png"
            alt="Phreaking Fun Logo"
            width={30}
            height={30}
            style={{ width: 'auto', height: 'auto' }}
            className="rounded-sm"
          />
          <TypingLogo />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* <Button
          value="$20,00"
          variant="secondary"
          rightIcon={<ChevronDown size={16} />}
        /> */}
        {/* <Button value="CASHIER" variant="primary" /> */}
        {/* <Button
          value="[23:58:26] 10% BOOST"
          variant="secondary"
          rightIcon={<Plus size={16} />}
        /> */}
        <Button
          value="Help"
          variant="secondary"
          rightIcon={<HelpCircle size={16} />}
          onClick={() => setIsHelpModalOpen(true)}
          title="Open Help & Tutorial"
        />
        {/* <Button
          value="[account] Blackmamba42"
          variant="secondary"
          rightIcon={<ChevronDown size={16} />}
        /> */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
          }) => {
            const ready = mounted;
            const connected =
              ready &&
              account &&
              chain &&
              (!authenticationStatus ||
                authenticationStatus === "authenticated");

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <Button
                        onClick={openConnectModal}
                        value="Connect Wallet_"
                        variant="primary"
                        rightIcon={<ChevronDown size={16} />}
                        data-testid="connect-wallet-button"
                      />
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <Button
                        onClick={openChainModal}
                        value="Wrong network"
                        variant="primary"
                        className="!bg-terminal-red"
                      />
                    );
                  }

                  return (
                    <Button
                      onClick={openAccountModal}
                      value={account.displayName}
                      variant="primary"
                      rightIcon={<ChevronDown size={16} />}
                    />
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>

    <HelpModal
      isOpen={isHelpModalOpen}
      onClose={() => setIsHelpModalOpen(false)}
    />
  </>
  );
}
