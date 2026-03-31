/**
 * Analytics middleware for Zustand.
 * Calls onStateChange when state changes (storeName + modified keys).
 */
export interface AnalyticsOptions {
  storeName: string;
  onStateChange?: (event: { storeName: string; keys: string[]; next: Record<string, unknown> }) => void;
}

type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;
type GetState<T> = () => T;

export function analyticsMiddleware<T extends Record<string, unknown>>(options: AnalyticsOptions) {
  const { storeName, onStateChange } = options;
  return (config: (set: SetState<T>, get: GetState<T>, api: unknown) => T) =>
    (set: SetState<T>, get: GetState<T>, api: unknown) => {
      const wrappedSet: SetState<T> = (arg) => {
        const prev = get() as Record<string, unknown>;
        set(arg);
        const next = get() as Record<string, unknown>;
        if (onStateChange && prev && next) {
          const keys = Object.keys(next).filter((k) => prev[k] !== next[k]);
          if (keys.length) onStateChange({ storeName, keys, next });
        }
      };
      return config(wrappedSet, get, api);
    };
}
