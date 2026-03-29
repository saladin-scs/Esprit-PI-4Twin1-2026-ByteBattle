/**
 * Base URL HTTP pour l’API Nest (Axios, fetch OAuth, etc.).
 *
 * - **Dev sans `VITE_API_URL`** : `/bb-api` → proxy Vite vers `localhost:3000` (évite CORS et le conflit
 *   SPA où un GET `/challenges` servirait le JSON au lieu de l’app).
 * - **Dev avec `VITE_API_URL`** : URL explicite (ex. tests contre un autre hôte).
 * - **Prod** : `VITE_API_URL` recommandé ; défaut `http://localhost:3000` si absent.
 */
function trimmedApiEnv(): string | undefined {
  const raw = import.meta.env.VITE_API_URL;
  if (raw === undefined || raw === null) return undefined;
  const t = String(raw).trim();
  return t || undefined;
}

export function getHttpApiBaseUrl(): string {
  const explicit = trimmedApiEnv();
  if (import.meta.env.DEV) {
    if (explicit) return explicit.replace(/\/$/, '');
    return '/bb-api';
  }
  if (explicit) return explicit.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/** Alias historique — même valeur que `getHttpApiBaseUrl`. */
export function getPublicApiUrl(): string {
  return getHttpApiBaseUrl();
}

/**
 * Pour Socket.IO : `undefined` = même origine que la page (dev + proxy `/socket.io`).
 * Sinon URL explicite du backend.
 */
export function getSocketIoServerUrl(): string | undefined {
  const explicit = trimmedApiEnv();
  if (import.meta.env.DEV && !explicit) return undefined;
  return getHttpApiBaseUrl();
}
