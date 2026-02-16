import React from "react";
import Toast from "./Toast";
import { useUIStore } from "@/stores";

const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useUIStore();

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </>
  );
};

export default ToastContainer;
