import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Heart, Calendar, Shield, Copy, ExternalLink } from "lucide-react";
import FrameReceiptModal from "./FrameReceiptModal";
import { DONATION_WALLETS, DONATION_ORGANIZATIONS, DonationId } from "@/constants/donations";
import type { NFTReceiptData } from "@/hooks/useDonation";

interface DonationReceiptModalProps {
  boxImage: string;
  donationId: DonationId;
  tokenIcon: string;
  tokenSymbol: string;
  donationAmount: string;
  transactionHash?: string;
  onClose: () => void;
  onNewDonation?: () => void;
  children?: React.ReactNode;
  isSpinning?: boolean;
  nftReceiptData?: NFTReceiptData | null;
  senderAddress?: string;
}

const CLIP_PATH =
  "polygon(25px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 25px)";

const DonationReceiptModal: React.FC<DonationReceiptModalProps> = ({
  boxImage,
  donationId,
  tokenIcon,
  tokenSymbol,
  donationAmount,
  transactionHash,
  onClose,
  onNewDonation,
  children,
  isSpinning = false,
  nftReceiptData,
  senderAddress,
}) => {
  const [currentOrgId, setCurrentOrgId] = useState(donationId);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const organization = DONATION_ORGANIZATIONS[currentOrgId];
  const recipientWallet = DONATION_WALLETS[donationId];
  const receiptTimestamp = nftReceiptData?.timestamp || Date.now();
  const currentDate = new Date(receiptTimestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
  const currentTime = new Date(receiptTimestamp).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  const fromAddress = nftReceiptData?.fromAddress || senderAddress || "Unknown";

  const allOrganizationIds = Object.keys(DONATION_ORGANIZATIONS).map(Number);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  useEffect(() => {
    if (isSpinning) {
      let cycleCount = 0;
      const maxCycles = 25;
      
      const cycleOrganizations = () => {
        if (cycleCount < maxCycles && isSpinning) {
          const randomOrgId = allOrganizationIds[Math.floor(Math.random() * allOrganizationIds.length)] as DonationId;
          setCurrentOrgId(randomOrgId);
          cycleCount++;
          
          const delay = Math.min(150 + (cycleCount * 8), 250);
          setTimeout(cycleOrganizations, delay);
        }
      };
      
      setTimeout(cycleOrganizations, 200);
    } else {
      setCurrentOrgId(donationId);
    }
  }, [isSpinning, donationId]);

  useEffect(() => {
    if (!isSpinning) {
      setCurrentOrgId(donationId);
    }
  }, [donationId, isSpinning]);

  const getTokenIcon = (tokenSymbol: string) => {
    switch (tokenSymbol.toUpperCase()) {
      case "ETH":
        return "/tokens/ethereum-icon.svg";
      case "USDC":
        return "/tokens/usdc.png";
      case "USDT":
        return "/tokens/usdt.svg";
      case "LINK":
        return "/assets/chainlink.svg";
      case "WETH":
        return "/assets/weth.svg";
      default:
        return tokenIcon || "/tokens/usdc.png"; 
    }
  };

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const formatWalletAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getBlockExplorerUrl = (hash: string) => {
    return `https://sepolia.etherscan.io/tx/${hash}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-terminal-black/80">
      <div className="relative">
        <FrameReceiptModal position="left" />
        <FrameReceiptModal position="right" />
        {children}
        
        <div
          className="font-mono text-terminal-white p-[1px] bg-terminal-green"
          style={{ clipPath: CLIP_PATH }}
        >
          <div
            className="bg-terminal-black text-terminal-green font-mono"
            style={{ width: 900, height: 650, clipPath: CLIP_PATH }}
          > 
          <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
            <span className="text-terminal-green font-bold text-sm uppercase">
              DONATION RECEIPT
            </span>
            <button onClick={onClose} className="flex items-center gap-2 group">
              <span className="text-terminal-gray-light font-bold text-sm group-hover:underline">
                EXIT
              </span>
              <X
                size={16}
                className="text-terminal-gray-light transition-colors hover:text-terminal-green-light"
              />
            </button>
          </div>

          <div className="p-6 space-y-4 h-full overflow-y-auto">
            {/* NFT Receipt badge */}
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-bold text-sm">NFT DONATION RECEIPT</span>
              </div>
              <p className="text-green-300 text-sm mt-1">
                This receipt serves as on-chain proof of your donation.
              </p>
            </div>

            <div className="grid grid-cols-2 mt-2 gap-4">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto relative">
                  <Image
                    src={boxImage}
                    alt="White Box"
                    fill
                    className="object-contain"
                  />
                </div>
                <p className="text-xs mt-2 text-terminal-green-dark">WHITE BOX</p>
                <p className="text-sm font-bold">P2P Exchange</p>
              </div>
              
              <div className="text-center">
                <div className="w-20 h-20 mx-auto flex items-center justify-center bg-terminal-green/10 rounded-lg relative">
                  {organization?.icon ? (
                    <Image
                      src={organization.icon}
                      alt={organization.name}
                      width={80}
                      height={80}
                      className="object-contain"
                    />
                  ) : (
                    <Heart className="w-20 h-20 text-terminal-green" />
                  )}
                </div>
                <p className="text-xs mt-2 text-terminal-green-dark">ORGANIZATION</p>
                <p className={`text-sm font-bold transition-all duration-200 ${
                  isSpinning 
                    ? 'text-terminal-green animate-pulse font-mono' 
                    : 'text-terminal-white'
                }`}>
                  {organization?.name || "Loading..."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-terminal-green rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">TRANSACTION INFO</h3>
                
                <div className="space-y-2 text-sm">
                  {/* From Address */}
                  <div className="flex justify-between items-center">
                    <span className="text-terminal-green-dark">From:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{formatWalletAddress(fromAddress)}</span>
                      <button
                        onClick={() => copyToClipboard(fromAddress, 'from')}
                        className="text-terminal-green-dark hover:text-terminal-green transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                      {copiedField === 'from' && <span className="text-terminal-green text-xs">Copied</span>}
                    </div>
                  </div>

                  {/* To Address */}
                  <div className="flex justify-between items-center">
                    <span className="text-terminal-green-dark">To:</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">{formatWalletAddress(recipientWallet)}</span>
                      <button
                        onClick={() => copyToClipboard(recipientWallet, 'to')}
                        className="text-terminal-green-dark hover:text-terminal-green transition-colors"
                      >
                        <Copy size={12} />
                      </button>
                      {copiedField === 'to' && <span className="text-terminal-green text-xs">Copied</span>}
                    </div>
                  </div>

                  {/* Token Name + Amount */}
                  <div className="flex justify-between">
                    <span className="text-terminal-green-dark">Token:</span>
                    <span className="font-bold">{nftReceiptData?.tokenName || tokenSymbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-green-dark">Amount:</span>
                    <div className="flex items-center gap-2">
                      <Image src={getTokenIcon(tokenSymbol)} alt={tokenSymbol} width={16} height={16} />
                      <span className="font-bold">{nftReceiptData?.tokenAmount || donationAmount} {nftReceiptData?.tokenName || tokenSymbol}</span>
                    </div>
                  </div>

                  {/* Value at time of transfer */}
                  <div className="flex justify-between">
                    <span className="text-terminal-green-dark">Value at Transfer:</span>
                    <span>{nftReceiptData?.valueAtTransfer || donationAmount} ETH equivalent</span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex justify-between">
                    <span className="text-terminal-green-dark">Date:</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{currentDate} {currentTime}</span>
                    </div>
                  </div>
                  
                  {/* TX Hash */}
                  {transactionHash && (
                    <div className="flex justify-between items-center">
                      <span className="text-terminal-green-dark">TX Hash:</span>
                      <div className="flex items-center gap-1">
                        <a
                          href={getBlockExplorerUrl(transactionHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                        >
                          {formatWalletAddress(transactionHash)}
                          <ExternalLink size={12} />
                        </a>
                        <button
                          onClick={() => copyToClipboard(transactionHash, 'tx')}
                          className="text-terminal-green-dark hover:text-terminal-green transition-colors"
                        >
                          <Copy size={12} />
                        </button>
                        {copiedField === 'tx' && <span className="text-terminal-green text-xs">Copied</span>}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span className="text-terminal-green-dark">Network:</span>
                    <span>Sepolia Testnet</span>
                  </div>
                </div>
              </div>
                    
              <div className="text-center p-4 bg-terminal-green/5 rounded-lg border border-terminal-green/20">
                <Heart className="w-8 h-8 mx-auto  text-red-500" />
                <h3 className="font-bold text-sm">Thank You for Your Donation!</h3>
                <p className="text-sm text-terminal-green-dark">
                  Your contribution will make a real difference in the work of {organization.name}.
                </p>
              </div>
            </div>
          </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationReceiptModal;
