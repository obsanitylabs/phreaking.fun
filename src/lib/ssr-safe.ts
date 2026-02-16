export const isClient = typeof window !== "undefined";

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (!isClient) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.warn('Failed to set localStorage item:', error);
    }
  },

  removeItem: (key: string): void => {
    if (!isClient) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('Failed to remove localStorage item:', error);
    }
  },
};

export const safeIndexedDB = {
  open: (name: string, version?: number) => {
    if (!isClient || !window.indexedDB) {
      return Promise.resolve(null);
    }
    return window.indexedDB.open(name, version);
  },

  deleteDatabase: (name: string) => {
    if (!isClient || !window.indexedDB) {
      return Promise.resolve(null);
    }
    return window.indexedDB.deleteDatabase(name);
  },
};

export function useClientOnly<T>(clientValue: T, serverValue: T): T {
  return isClient ? clientValue : serverValue;
}
