/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL du backend ; si absent, défaut http://localhost:3000 (voir getPublicApiUrl) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
