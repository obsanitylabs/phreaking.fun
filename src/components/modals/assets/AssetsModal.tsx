import React, { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import AssetsFrame from "./AssetsFrame";

interface Asset {
  name: string;
  amount: string;
}

interface AssetsModalProps {
  onClose: () => void;
}

const CLIP_PATH =
  "polygon(25px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 25px)";
const ANIMATION_DURATION = 300;

const MOCK_ASSETS: Asset[] = Array(10).fill({ name: "ARMOR", amount: "1,00" });

const styles = {
  modal: {
    base: "fixed inset-0 flex items-center justify-center bg-terminal-black/80 z-50 transition-opacity duration-300",
    content:
      "w-[400px] font-mono text-terminal-white p-[1px] bg-terminal-green transition-all duration-300",
    inner: "bg-terminal-black",
    header:
      "relative h-10 border-b border-terminal-green flex items-center justify-between px-6",
    headerTitle: "text-terminal-green font-bold text-sm",
    closeButton: "hover:text-terminal-green-light transition-colors",
    tableHeader:
      "flex items-center h-10 border-b border-terminal-green px-6 text-xs",
    tableRow:
      "flex items-center h-10 border-b border-terminal-green px-6 text-xs hover:bg-terminal-green-hover cursor-pointer",
    assetIcon: "relative w-[18px] h-[18px]",
    assetName: "text-terminal-green hover:underline",
    scrollContainer: "max-h-[350px] overflow-y-auto custom-scrollbar",
  },
} as const;

const AssetRow: React.FC<{ asset: Asset }> = ({ asset }) => (
  <div className={styles.modal.tableRow}>
    <div className="flex items-center gap-2 w-1/2">
      <div className={styles.modal.assetIcon}>
        <Image
          src="/image 13.png"
          alt={asset.name}
          fill
          className="object-cover"
        />
      </div>
      <span className={styles.modal.assetName}>{asset.name}</span>
    </div>
    <span className="w-1/2">{asset.amount}</span>
  </div>
);

const AssetsModal: React.FC<AssetsModalProps> = ({ onClose }) => {
  const [show, setShow] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setShow(false);
    setTimeout(onClose, ANIMATION_DURATION);
  };

  const modalClasses = `${styles.modal.content} ${
    show ? "opacity-100 scale-100" : "opacity-0 scale-95"
  }`;

  return (
    <div
      className={styles.modal.base}
      style={{ opacity: isClosing ? 0 : 1 }}
      onClick={handleClose}
    >
      <AssetsFrame position="left" />
      <AssetsFrame position="right" />

      <div
        className={modalClasses}
        style={{ clipPath: CLIP_PATH }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modal.inner} style={{ clipPath: CLIP_PATH }}>
          <div className="relative h-10 border-b border-terminal-green flex items-center justify-between px-6">
            <span className="text-terminal-green font-bold text-sm uppercase">
              ASSETS
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

          <div className={styles.modal.tableHeader}>
            <div className="flex items-center gap-2 w-1/2">
              <div className="w-[18px] h-[18px]" />
              <span>Asset</span>
            </div>
            <span className="w-1/2">Approved Amount</span>
          </div>

          <div className={styles.modal.scrollContainer}>
            {MOCK_ASSETS.map((asset, index) => (
              <AssetRow key={index} asset={asset} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsModal;
