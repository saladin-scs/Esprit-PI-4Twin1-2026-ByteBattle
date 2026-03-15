/**
 * Hook de store avec gestion d'erreur centralisée.
 * Utilisable avec tout store Zustand exposant error et setError.
 */
import { useCallback } from 'react';

export interface StoreWithError {
  error: string | null;
  setError: (error: string | null) => void;
}

/**
 * Retourne error, clearError et withErrorHandling pour un store ayant error/setError.
 * withErrorHandling enveloppe une action async et appelle setError en cas d'échec.
 */
export function useStoreWithError<T extends StoreWithError>(
  useStore: () => T
): T & {
  clearError: () => void;
  withErrorHandling: <R>(fn: () => Promise<R>, fallbackMessage?: string) => Promise<R | null>;
} {
  const store = useStore();
  const { error, setError } = store;

  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  const withErrorHandling = useCallback(
    async <R>(fn: () => Promise<R>, fallbackMessage = 'An error occurred'): Promise<R | null> => {
      setError(null);
      try {
        const result = await fn();
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : fallbackMessage;
        setError(message);
        return null;
      }
    },
    [setError]
  );

  return {
    ...store,
    error,
    clearError,
    withErrorHandling,
  };
}
