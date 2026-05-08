/**
 * Shared HTTP client - single Axios instance for the whole app.
 * Interceptors (auth, errors) are centralized here.
 */

import axios, { type AxiosInstance } from 'axios';
import { getHttpApiBaseUrl } from '../../config/publicEnv';

const API_URL = getHttpApiBaseUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RetryableRequestConfig = {
  _retry?: boolean;
  headers?: Record<string, string>;
};

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let axios set Content-Type with boundary for FormData (file uploads)
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem('refresh_token');
    refreshPromise = apiClient
      .post('/auth/refresh', refreshToken ? { refresh_token: refreshToken } : {}, {
        // prevent interceptor loops
        headers: { 'x-skip-auth-refresh': '1' },
      })
      .then((res) => {
        const nextAccess = res.data?.access_token as string | undefined;
        const nextRefresh = res.data?.refresh_token as string | undefined;
        if (nextAccess) localStorage.setItem('token', nextAccess);
        if (nextRefresh) localStorage.setItem('refresh_token', nextRefresh);
        return nextAccess ?? null;
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status as number | undefined;
    const originalConfig = (error?.config || {}) as RetryableRequestConfig;
    const skipRefresh = String(originalConfig.headers?.['x-skip-auth-refresh'] || '') === '1';

    if (status !== 401 || originalConfig._retry || skipRefresh) {
      return Promise.reject(error);
    }

    originalConfig._retry = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      return Promise.reject(error);
    }

    originalConfig.headers = {
      ...(originalConfig.headers || {}),
      Authorization: `Bearer ${newToken}`,
    };
    return apiClient(originalConfig as any);
  },
);

export default apiClient;
