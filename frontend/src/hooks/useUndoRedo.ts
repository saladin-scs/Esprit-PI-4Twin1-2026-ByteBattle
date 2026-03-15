/**
 * Hook Undo/Redo générique pour un état local.
 * Conserve un historique limité et expose undo/redo/clearHistory.
 */
import { useCallback, useRef, useState } from 'react';

const DEFAULT_LIMIT = 50;

export interface UseUndoRedoOptions {
  limit?: number;
}

export interface UseUndoRedoReturn<T> {
  state: T;
  setState: (next: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo<T>(initialState: T, options: UseUndoRedoOptions = {}): UseUndoRedoReturn<T> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const [state, setStateInternal] = useState<T>(initialState);
  const [historySizes, setHistorySizes] = useState({ past: 0, future: 0 });
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);

  const setState = useCallback(
    (next: T | ((prev: T) => T)) => {
      setStateInternal((prev) => {
        const nextState = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        pastRef.current = [...pastRef.current, prev].slice(-limit);
        futureRef.current = [];
        setHistorySizes(() => ({ past: Math.min(pastRef.current.length, limit), future: 0 }));
        return nextState;
      });
    },
    [limit]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [state, ...futureRef.current].slice(0, limit);
    setHistorySizes({ past: pastRef.current.length, future: futureRef.current.length });
    setStateInternal(previous);
  }, [state, limit]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    pastRef.current = [...pastRef.current, state].slice(-limit);
    setHistorySizes({ past: pastRef.current.length, future: futureRef.current.length });
    setStateInternal(next);
  }, [state, limit]);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    setHistorySizes({ past: 0, future: 0 });
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    clearHistory,
    canUndo: historySizes.past > 0,
    canRedo: historySizes.future > 0,
  };
}
