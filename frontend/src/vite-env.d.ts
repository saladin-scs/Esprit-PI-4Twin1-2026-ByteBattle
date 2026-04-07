/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
    * Absolute backend URL (e.g. http://localhost:3000). In dev, if undefined: Vite `/bb-api` proxy.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
