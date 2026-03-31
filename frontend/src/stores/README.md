# Stores & middlewares

## Configuration (production / dev)

- **`storeConfig.ts`** : `isProduction`, `isDev`, `getStoreConfig()`, `setStoreConfig()`, `createStoreConfig()`. In prod, disable logging; enable analytics if needed.

## Middlewares Zustand

- **`middleware/logging.ts`** : `loggingMiddleware(storeName)` - in dev, logs each `set` (prev/next).
- **`middleware/analytics.ts`** : `analyticsMiddleware({ storeName, onStateChange })` - calls `onStateChange` on every change (storeName, keys, next).
- **`middleware/temporal.ts`** : undo/redo types; for state with history, use the **`useUndoRedo`** hook in `hooks/useUndoRedo.ts`.

### Example with logging

```ts
import { create } from 'zustand';
import { loggingMiddleware } from './middleware';

const useMyStore = create(
  loggingMiddleware('my-store')((set) => ({
    count: 0,
    inc: () => set((s) => ({ count: s.count + 1 })),
  }))
);
```

### Example with analytics

```ts
analyticsMiddleware({
  storeName: 'challenges',
  onStateChange: (e) => analytics.track('store_change', e),
})((set, get) => ({ ... }))
```
