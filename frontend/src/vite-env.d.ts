/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * URL absolue du backend (ex. http://localhost:3000). En dev, si non défini : proxy Vite `/bb-api`.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
