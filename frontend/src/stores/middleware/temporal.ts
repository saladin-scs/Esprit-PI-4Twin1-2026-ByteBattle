/**
 * Middleware Undo/Redo pour Zustand (version simplifiée).
 * Pour un store avec undo/redo intégré, utiliser le hook useUndoRedo ou
 * un store dédié avec historique (voir storeConfig).
 */

export interface TemporalActions {
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const TEMPORAL_HISTORY_LIMIT = 50;
