import { getHttpApiBaseUrl } from '../config/publicEnv';

function stripTrailingSlash(value: string): string {
  return value.replace(/\/$/, '');
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isLocalHost(hostname: string): boolean {
  const host = String(hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/**
 * Resolve media URLs (avatars/covers) across dev/prod setups.
 * Supports absolute URLs, API-relative paths, and legacy localhost URLs.
 */
export function resolveMediaUrl(input?: string | null): string | undefined {
  const raw = String(input || '').trim();
  if (!raw) return undefined;

  if (/^(blob:|data:)/i.test(raw)) return raw;

  const apiBase = getHttpApiBaseUrl();

  if (isAbsoluteHttpUrl(raw)) {
    try {
      const parsed = new URL(raw);
      if (
        isLocalHost(parsed.hostname) &&
        typeof window !== 'undefined' &&
        !isLocalHost(window.location.hostname) &&
        isAbsoluteHttpUrl(apiBase)
      ) {
        const api = new URL(apiBase);
        return `${api.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      // Keep original URL if parsing fails.
    }
    return raw;
  }

  const relativePath = raw.startsWith('/') ? raw : `/${raw}`;

  if (isAbsoluteHttpUrl(apiBase)) {
    return `${stripTrailingSlash(apiBase)}${relativePath}`;
  }

  if (apiBase.startsWith('/')) {
    return `${stripTrailingSlash(apiBase)}${relativePath}`;
  }

  return relativePath;
}
