/**
 * Logging middleware for Zustand.
 * In dev, logs state changes (store name + diff).
 */
type SetState<T> = (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;
type GetState<T> = () => T;

export function loggingMiddleware<T>(storeName: string) {
  return (
    config: (set: SetState<T>, get: GetState<T>, api: unknown) => T
  ): ((set: SetState<T>, get: GetState<T>, api: unknown) => T) => {
    return (set, get, api) => {
      const wrappedSet: SetState<T> = (arg) => {
        if (import.meta.env.DEV) {
          const prev = get();
          set(arg);
          const next = get();
          console.debug(`[store:${storeName}]`, { prev, next });
        } else {
          set(arg);
        }
      };
      return config(wrappedSet, get, api);
    };
  };
}
