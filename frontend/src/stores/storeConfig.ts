/**
 * Configuration du store pour production vs développement.
 * - Dev: logging activé, analytics optionnel.
 * - Prod: pas de log, analytics si fourni.
 */

export const isProduction = import.meta.env.PROD;
export const isDev = import.meta.env.DEV;

export interface StoreConfig {
  /** Activer le middleware de logging (défaut: !isProduction) */
  enableLogging: boolean;
  /** Activer l'analytics (callback appelé à chaque changement) */
  enableAnalytics: boolean;
  /** Nom du store pour les logs / analytics */
  storeName: string;
}

const defaultConfig: StoreConfig = {
  enableLogging: isDev,
  enableAnalytics: false,
  storeName: 'app',
};

let globalConfig: StoreConfig = { ...defaultConfig };

export function getStoreConfig(): StoreConfig {
  return { ...globalConfig };
}

export function setStoreConfig(partial: Partial<StoreConfig>) {
  globalConfig = { ...globalConfig, ...partial };
}

export function createStoreConfig(overrides: Partial<StoreConfig> = {}): StoreConfig {
  return {
    enableLogging: isDev && overrides.enableLogging !== false,
    enableAnalytics: isProduction ? (overrides.enableAnalytics ?? false) : (overrides.enableAnalytics ?? false),
    storeName: overrides.storeName ?? 'app',
    ...overrides,
  };
}
