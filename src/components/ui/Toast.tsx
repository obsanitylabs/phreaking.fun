import React, { useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "error" | "success" | "info" | "warning";

interface ToastProps {
  message: string;
  type: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case "error":
      return {
        bg: "bg-red-900/90",
        border: "border-red-500",
        text: "text-red-400",
        icon: <AlertCircle size={20} className="text-red-400" />,
      };
    case "success":
      return {
        bg: "bg-green-900/90",
        border: "border-green-500",
        text: "text-green-400",
        icon: <CheckCircle size={20} className="text-green-400" />,
      };
    case "info":
      return {
        bg: "bg-blue-900/90",
        border: "border-blue-500",
        text: "text-blue-400",
        icon: <Info size={20} className="text-blue-400" />,
      };
    case "warning":
      return {
        bg: "bg-yellow-900/90",
        border: "border-yellow-500",
        text: "text-yellow-400",
        icon: <AlertCircle size={20} className="text-yellow-400" />,
      };
    default:
      return {
        bg: "bg-gray-900/90",
        border: "border-gray-500",
        text: "text-gray-400",
        icon: <Info size={20} className="text-gray-400" />,
      };
  }
};

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  const styles = getToastStyles(type);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`fixed top-6 right-6 z-[9999] max-w-md ${styles.bg} ${styles.border} border backdrop-blur-sm rounded-lg p-4 shadow-2xl`}
          style={{
            clipPath:
              "polygon(10px 0%, 100% 0%, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0% 100%, 0% 10px)",
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">{styles.icon}</div>
            <div className="flex-1">
              <p className={`text-sm font-mono ${styles.text}`}>{message}</p>
            </div>
            <button
              onClick={onClose}
              className={`flex-shrink-0 ${styles.text} hover:text-white transition-colors`}
            >
              <X size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Toast;
