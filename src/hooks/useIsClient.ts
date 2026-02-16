import { useEffect, useState } from "react";

/**
 * Hook para detectar se o código está executando no cliente
 * Útil para evitar problemas de hydration e SSR
 */
export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}
