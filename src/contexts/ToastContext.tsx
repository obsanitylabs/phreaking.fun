import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastType } from "@/components/ui/Toast";

interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
  id: string;
}

interface ToastContextType {
  toasts: ToastState[];
  showToast: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
  showInfo: (message: string) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString();
    const newToast: ToastState = {
      message,
      type,
      isVisible: true,
      id,
    };

    setToasts((prev) => [...prev, newToast]);
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showError = useCallback(
    (message: string) => {
      showToast(message, "error");
    },
    [showToast],
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, "success");
    },
    [showToast],
  );

  const showInfo = useCallback(
    (message: string) => {
      showToast(message, "info");
    },
    [showToast],
  );

  const value: ToastContextType = {
    toasts,
    showToast,
    showError,
    showSuccess,
    showInfo,
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext deve ser usado dentro de ToastProvider");
  }
  return context;
}
