"use client";

import { useEffect, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import Button from "../ui/button";
import { ChevronDown } from "lucide-react";
import { RainbowKitErrorBoundary } from "../RainbowKitErrorBoundary";

export function ConnectWallet() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <Button
        value="Loading..."
        variant="primary"
        disabled
        rightIcon={<ChevronDown size={16} />}
      />
    );
  }

  return (
    <RainbowKitErrorBoundary>
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
            (!authenticationStatus || authenticationStatus === "authenticated");

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
    </RainbowKitErrorBoundary>
  );
}
