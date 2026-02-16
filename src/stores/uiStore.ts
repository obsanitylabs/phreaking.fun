import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';

export type ToastType = "info" | "success" | "error" | "warning";

export interface ToastState {
  message: string;
  type: ToastType;
  isVisible: boolean;
  id: string;
  duration?: number;
}

export interface ModalState {
  mysteryBoxModal: {
    isOpen: boolean;
    title?: string;
    image?: string;
  };
  receiptModal: {
    isOpen: boolean;
    boxData?: any;
  };
  errorModal: {
    isOpen: boolean;
    message?: string;
  };
  tutorialModal: {
    isOpen: boolean;
  };
}

export interface UIState {
  toasts: ToastState[];
  
  modals: ModalState;
  
  isLoading: boolean;
  loadingMessage?: string;
  
  splashScreen: {
    isVisible: boolean;
    isLoading: boolean;
  };
}

export interface UIActions {
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  hideToast: (id: string) => void;
  clearToasts: () => void;
  
  showError: (message: string, duration?: number) => string;
  showSuccess: (message: string, duration?: number) => string;
  showInfo: (message: string, duration?: number) => string;
  showWarning: (message: string, duration?: number) => string;
  
  openMysteryBoxModal: (title?: string, image?: string) => void;
  closeMysteryBoxModal: () => void;
  
  openReceiptModal: (boxData?: any) => void;
  closeReceiptModal: () => void;
  
  openErrorModal: (message?: string) => void;
  closeErrorModal: () => void;
  
  openTutorialModal: () => void;
  closeTutorialModal: () => void;
  
  closeAllModals: () => void;
  
  setLoading: (isLoading: boolean, message?: string) => void;
  
  showSplashScreen: () => void;
  hideSplashScreen: () => void;
  setSplashLoading: (isLoading: boolean) => void;
}

export type UIStore = UIState & UIActions;

const initialModalState: ModalState = {
  mysteryBoxModal: {
    isOpen: false,
  },
  receiptModal: {
    isOpen: false,
  },
  errorModal: {
    isOpen: false,
  },
  tutorialModal: {
    isOpen: false,
  },
};

const initialState: UIState = {
  toasts: [],
  modals: initialModalState,
  isLoading: false,
  splashScreen: {
    isVisible: true,
    isLoading: false,
  },
};

const toastTimeouts: Record<string, NodeJS.Timeout> = {};

export const useUIStore = create<UIStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,

      showToast: (message: string, type: ToastType = "info", duration: number = 5000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        
        set((state) => {
          state.toasts.push({
            message,
            type,
            isVisible: true,
            id,
            duration,
          });
        });

        if (duration > 0) {
          toastTimeouts[id] = setTimeout(() => {
            get().hideToast(id);
          }, duration);
        }

        return id;
      },

      hideToast: (id: string) => {
        if (toastTimeouts[id]) {
          clearTimeout(toastTimeouts[id]);
          delete toastTimeouts[id];
        }

        set((state) => {
          state.toasts = state.toasts.filter(toast => toast.id !== id);
        });
      },

      clearToasts: () => {
        Object.values(toastTimeouts).forEach(timeout => clearTimeout(timeout));
        Object.keys(toastTimeouts).forEach(id => delete toastTimeouts[id]);
        
        set((state) => {
          state.toasts = [];
        });
      },

      showError: (message: string, duration: number = 8000) => {
        return get().showToast(message, "error", duration);
      },

      showSuccess: (message: string, duration: number = 5000) => {
        return get().showToast(message, "success", duration);
      },

      showInfo: (message: string, duration: number = 5000) => {
        return get().showToast(message, "info", duration);
      },

      showWarning: (message: string, duration: number = 6000) => {
        return get().showToast(message, "warning", duration);
      },

      openMysteryBoxModal: (title?: string, image?: string) => {
        set((state) => {
          state.modals.mysteryBoxModal = {
            isOpen: true,
            title,
            image,
          };
        });
      },

      closeMysteryBoxModal: () => {
        set((state) => {
          state.modals.mysteryBoxModal = {
            isOpen: false,
          };
        });
      },

      openReceiptModal: (boxData?: any) => {
        set((state) => {
          state.modals.receiptModal = {
            isOpen: true,
            boxData,
          };
        });
      },

      closeReceiptModal: () => {
        set((state) => {
          state.modals.receiptModal = {
            isOpen: false,
          };
        });
      },

      openErrorModal: (message?: string) => {
        set((state) => {
          state.modals.errorModal = {
            isOpen: true,
            message,
          };
        });
      },

      closeErrorModal: () => {
        set((state) => {
          state.modals.errorModal = {
            isOpen: false,
          };
        });
      },

      openTutorialModal: () => {
        set((state) => {
          state.modals.tutorialModal = {
            isOpen: true,
          };
        });
      },

      closeTutorialModal: () => {
        set((state) => {
          state.modals.tutorialModal = {
            isOpen: false,
          };
        });
      },

      closeAllModals: () => {
        set((state) => {
          state.modals = { ...initialModalState };
        });
      },

      setLoading: (isLoading: boolean, message?: string) => {
        set((state) => {
          state.isLoading = isLoading;
          state.loadingMessage = message;
        });
      },

      showSplashScreen: () => {
        set((state) => {
          state.splashScreen.isVisible = true;
        });
      },

      hideSplashScreen: () => {
        set((state) => {
          state.splashScreen.isVisible = false;
        });
      },

      setSplashLoading: (isLoading: boolean) => {
        set((state) => {
          state.splashScreen.isLoading = isLoading;
        });
      },
    }))
  )
);

export const selectToasts = (state: UIStore) => state.toasts;
export const selectModals = (state: UIStore) => state.modals;
export const selectMysteryBoxModal = (state: UIStore) => state.modals.mysteryBoxModal;
export const selectReceiptModal = (state: UIStore) => state.modals.receiptModal;
export const selectErrorModal = (state: UIStore) => state.modals.errorModal;
export const selectTutorialModal = (state: UIStore) => state.modals.tutorialModal;
export const selectIsLoading = (state: UIStore) => state.isLoading;
export const selectSplashScreen = (state: UIStore) => state.splashScreen;
