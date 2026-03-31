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
