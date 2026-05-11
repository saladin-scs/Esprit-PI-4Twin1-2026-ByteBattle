/**
 * Persistence hook with validation (Yup).
 * Loads/saves state in localStorage or sessionStorage with validation schema.
 */
import { useCallback, useEffect, useState } from 'react';
import type { Schema } from 'yup';

const DEFAULT_KEY_PREFIX = 'bytebattle-persist';

export interface UsePersistWithValidationOptions<T extends object> {
  key: string;
  schema: Schema<T>;
  storage?: Storage;
  defaultState: T;
  /** If true, loads and validates on mount; otherwise save only. */
  loadOnMount?: boolean;
}

export interface UsePersistWithValidationResult<T> {
  data: T;
  setData: (next: T | ((prev: T) => T)) => void;
  error: string | null;
  clearError: () => void;
  save: () => void;
  load: () => boolean;
  isLoaded: boolean;
}

export function usePersistWithValidation<T extends object>(
  options: UsePersistWithValidationOptions<T>
): UsePersistWithValidationResult<T> {
  const {
    key,
    schema,
    storage = typeof window !== 'undefined' ? localStorage : undefined,
    defaultState,
    loadOnMount = true,
  } = options;

  const fullKey = `${DEFAULT_KEY_PREFIX}:${key}`;
  const [data, setDataState] = useState<T>(defaultState);
  const [error, setError] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const load = useCallback((): boolean => {
    if (!storage) return false;
    try {
      const raw = storage.getItem(fullKey);
      if (raw == null) {
        setDataState(defaultState);
        setError(null);
        setIsLoaded(true);
        return true;
      }
      const parsed = JSON.parse(raw) as unknown;
      const validated = schema.validateSync(parsed, { stripUnknown: true }) as T;
      setDataState(validated);
      setError(null);
      setIsLoaded(true);
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Invalid persisted data';
      setError(message);
      setDataState(defaultState);
      setIsLoaded(true);
      return false;
    }
  }, [fullKey, storage, schema, defaultState]);

  const save = useCallback(() => {
    if (!storage) return;
    try {
      schema.validateSync(data, { stripUnknown: true });
      storage.setItem(fullKey, JSON.stringify(data));
      setError(null);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Validation failed';
      setError(message);
    }
  }, [storage, fullKey, data, schema]);

  const setData = useCallback((next: T | ((prev: T) => T)) => {
    setDataState(next);
  }, []);

  useEffect(() => {
    if (loadOnMount) load();
  }, [loadOnMount, load]);

  return {
    data,
    setData,
    error,
    clearError: () => setError(null),
    save,
    load,
    isLoaded,
  };
}
