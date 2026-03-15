/**
 * Middleware de logging pour Zustand.
 * En dev, log les changements d'état (nom du store + diff).
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
