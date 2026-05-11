/**
 * Store configuration for production vs development.
 * - Dev: logging enabled, analytics optional.
 * - Prod: no logging, analytics if provided.
 */

export const isProduction = import.meta.env.PROD;
export const isDev = import.meta.env.DEV;

export interface StoreConfig {
  /** Enable logging middleware (default: !isProduction) */
  enableLogging: boolean;
  /** Enable analytics (callback called on each change) */
  enableAnalytics: boolean;
  /** Store name for logs / analytics */
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
