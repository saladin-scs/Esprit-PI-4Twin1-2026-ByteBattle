/**
 * Client HTTP partagé – une seule instance Axios pour toute l'app.
 * Interceptors (auth, erreurs) centralisés ici.
 */

import axios, { type AxiosInstance } from 'axios';
import { getPublicApiUrl } from '../../config/publicEnv';

const API_URL = getPublicApiUrl();

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default apiClient;
