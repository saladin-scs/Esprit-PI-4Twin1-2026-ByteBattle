# Stores & middlewares

## Configuration (production / dev)

- **`storeConfig.ts`** : `isProduction`, `isDev`, `getStoreConfig()`, `setStoreConfig()`, `createStoreConfig()`. En prod, désactiver le logging ; activer l’analytics si besoin.

## Middlewares Zustand

- **`middleware/logging.ts`** : `loggingMiddleware(storeName)` — en dev, log chaque `set` (prev/next).
- **`middleware/analytics.ts`** : `analyticsMiddleware({ storeName, onStateChange })` — appelle `onStateChange` à chaque changement (storeName, keys, next).
- **`middleware/temporal.ts`** : types pour undo/redo ; pour un état avec historique, utiliser le hook **`useUndoRedo`** dans `hooks/useUndoRedo.ts`.

### Exemple avec logging

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

### Exemple avec analytics

```ts
analyticsMiddleware({
  storeName: 'challenges',
  onStateChange: (e) => analytics.track('store_change', e),
})((set, get) => ({ ... }))
```
