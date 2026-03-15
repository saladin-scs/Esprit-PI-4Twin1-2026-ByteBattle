/**
 * Hook de synchronisation store ↔ query (URL search params).
 * Garde les filtres / page du store alignés avec l'URL et vice versa.
 */
import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface QuerySyncConfig<T> {
  /** Map state → query keys (e.g. { search: 'q', difficulty: 'diff', page: 'page' }) */
  stateToQuery: { [K in keyof T]?: string };
  /** Map query → state (parser par clé) */
  queryToState: (key: string, value: string | null) => T[keyof T] | undefined;
  /** État actuel du store */
  state: T;
  /** Mise à jour du store */
  setState: (partial: Partial<T>) => void;
  /** Si true, écrire l'URL au montage depuis le store (défaut: true) */
  pushStateOnMount?: boolean;
}

/**
 * Synchronise un slice du store avec les search params.
 * - Au montage: lit l'URL et met à jour le store (optionnel), puis écoute le store et met à jour l'URL.
 * - Quand l'URL change (ex. navigate), met à jour le store.
 */
export function useStoreQuerySync<T extends Record<string, unknown>>(config: QuerySyncConfig<T>) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { stateToQuery, queryToState, state, setState, pushStateOnMount = true } = config;

  // URL → store
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

  // Store → URL (quand state change)
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
