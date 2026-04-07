/**
 * HTTP base URL for Nest API (Axios, OAuth fetch, etc.).
 *
 * - **Dev without `VITE_API_URL`**: `/bb-api` -> Vite proxy to `localhost:3000` (avoids CORS and SPA conflict
 *   where GET `/challenges` could return JSON instead of the app).
 * - **Dev with `VITE_API_URL`**: explicit URL (e.g. tests against another host).
 * - **Prod**: `VITE_API_URL` recommended; default `http://localhost:3000` if missing.
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

/** Historical alias - same value as `getHttpApiBaseUrl`. */
export function getPublicApiUrl(): string {
  return getHttpApiBaseUrl();
}

/**
 * For Socket.IO we always prefer an explicit backend origin in dev.
 * This avoids noisy Vite ws-proxy ECONNABORTED logs when sockets reconnect/disconnect rapidly.
 */
export function getSocketIoServerUrl(): string | undefined {
  const explicit = trimmedApiEnv();
  if (import.meta.env.DEV && !explicit) return 'http://127.0.0.1:3000';
  return getHttpApiBaseUrl();
}
