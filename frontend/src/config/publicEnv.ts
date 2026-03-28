/**
 * URL du backend Nest (REST + Socket.IO).
 * Doit correspondre à `PORT` / URL d’écoute du backend.
 * Côté backend, `CORS_ORIGIN` doit inclure l’origine du front (ex. http://localhost:5173).
 */
export function getPublicApiUrl(): string {
  const raw = import.meta.env.VITE_API_URL;
  if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/$/, '');
  return 'http://localhost:3000';
}
