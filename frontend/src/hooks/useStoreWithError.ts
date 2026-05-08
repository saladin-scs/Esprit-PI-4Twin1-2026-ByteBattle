/**
 * Store hook with centralized error handling.
 * Usable with any Zustand store exposing error and setError.
 */
import { useCallback } from 'react';

export interface StoreWithError {
  error: string | null;
  setError: (error: string | null) => void;
}

/**
 * Returns error, clearError and withErrorHandling for stores with error/setError.
 * withErrorHandling wraps an async action and calls setError on failure.
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
