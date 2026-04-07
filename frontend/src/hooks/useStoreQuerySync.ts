/**
 * Store ↔ query synchronization hook (URL search params).
 * Keeps store filters/page aligned with URL and vice versa.
 */
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface QuerySyncConfig<T> {
  /** Map state → query keys (e.g. { search: 'q', difficulty: 'diff', page: 'page' }) */
  stateToQuery: { [K in keyof T]?: string };
  /** Map query -> state (parser per key) */
  queryToState: (key: string, value: string | null) => T[keyof T] | undefined;
  /** Current store state */
  state: T;
  /** Store update function */
  setState: (partial: Partial<T>) => void;
  /** If true, write URL on mount from store (default: true) */
  pushStateOnMount?: boolean;
}

/**
 * Synchronizes a store slice with search params.
 * - On mount: reads URL and updates store (optional), then listens to store and updates URL.
 * - When URL changes (e.g. navigate), updates store.
 */
export function useStoreQuerySync<T extends Record<string, unknown>>(config: QuerySyncConfig<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { stateToQuery, queryToState, state, setState, pushStateOnMount = true } = config;

  // URL -> store
  useEffect(() => {
    const partial: Partial<T> = {};
    let hasChange = false;
    for (const stateKey of Object.keys(stateToQuery) as (keyof T)[]) {
      const queryKey = stateToQuery[stateKey];
      if (!queryKey) continue;
      const value = searchParams.get(queryKey);
      const parsed = queryToState(queryKey, value);
      if (parsed !== undefined && parsed !== state[stateKey]) {
        (partial as Record<string, unknown>)[stateKey as string] = parsed;
        hasChange = true;
      }
    }
    if (hasChange) setState(partial);
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // Store -> URL (when state changes)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    let changed = false;
    for (const stateKey of Object.keys(stateToQuery) as (keyof T)[]) {
      const queryKey = stateToQuery[stateKey];
      if (!queryKey) continue;
      const v = state[stateKey];
      const str = v == null || v === '' ? null : String(v);
      if (next.get(queryKey) !== str) {
        changed = true;
        if (str) next.set(queryKey, str);
        else next.delete(queryKey);
      }
    }
    if (changed && (pushStateOnMount || searchParams.toString() !== ''))
      setSearchParams(next, { replace: true });
  }, [state, stateToQuery, pushStateOnMount]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStateAndQuery = useCallback(
    (partial: Partial<T>) => {
      setState(partial);
      const next = new URLSearchParams(searchParams);
      for (const stateKey of Object.keys(partial) as (keyof T)[]) {
        const queryKey = stateToQuery[stateKey];
        if (!queryKey) continue;
        const v = partial[stateKey];
        const str = v == null || v === '' ? null : String(v);
        if (str) next.set(queryKey, str);
        else next.delete(queryKey);
      }
      setSearchParams(next, { replace: true });
    },
    [setState, stateToQuery, searchParams, setSearchParams]
  );

  return { setStateAndQuery };
}
