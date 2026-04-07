/**
 * Undo/Redo middleware for Zustand (simplified version).
 * For a store with integrated undo/redo, use the useUndoRedo hook or
 * a dedicated store with history (see storeConfig).
 */

export interface TemporalActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const TEMPORAL_HISTORY_LIMIT = 50;
