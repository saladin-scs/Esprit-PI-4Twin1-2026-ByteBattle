import axios from 'axios';
import type { ExecuteTestCase } from '../types/challenge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
    apiClient.post('/auth/login', credentials),
  verify2faLogin: (data: { twoFactorToken: string; code: string; rememberMe?: boolean }) =>
    apiClient.post('/auth/2fa/verify-login', data),
  register: (userData: { email: string; username: string; password: string }) =>
    apiClient.post('/auth/register', userData),
  getProfile: () => apiClient.get('/auth/profile'),
  refresh: (refresh_token?: string) => apiClient.post('/auth/refresh', refresh_token ? { refresh_token } : {}),
  logout: (refresh_token?: string) => apiClient.post('/auth/logout', refresh_token ? { refresh_token } : {}),
  verifyEmail: (token: string) => apiClient.post('/auth/verify-email', { token }),
  resendVerification: (email: string) => apiClient.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
  twofaSetup: () => apiClient.post('/auth/2fa/setup'),
  twofaEnable: (code: string) => apiClient.post('/auth/2fa/enable', { code }),
  twofaDisable: (code: string) => apiClient.post('/auth/2fa/disable', { code }),
};

export const usersApi = {
  me: () => apiClient.get('/users/me'),
  updateMe: (data: any) => apiClient.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/users/me/change-password', data),
  myStats: () => apiClient.get('/users/me/stats'),
  publicByUsername: (username: string) => apiClient.get(`/users/public/${username}`),
};

export const challengesApi = {
  getAll: () => apiClient.get('/challenges'),
  getOne: (id: string) => apiClient.get(`/challenges/${id}`),
  create: (challenge: any) => apiClient.post('/challenges', challenge),
  generate: (data: { difficulty: string; topic: string }) =>
    apiClient.post('/challenges/generate', data),
};

export const codeExecutionApi = {
  execute: (data: { code: string; language: string; testCases: ExecuteTestCase[] }) =>
    apiClient.post('/code-execution/run', data),
};

export const feedbackApi = {
  analyze: (data: {
    code: string;
    language?: string;
    tests_passed?: boolean;
    execution_error?: string;
    runtime_ms?: number;
    memory_kb?: number;
    task_description?: string;
  }) => apiClient.post('/feedback/analyze', data),
};

export const competitionsApi = {
  getAll: () => apiClient.get('/competitions'),
  getOne: (id: string) => apiClient.get(`/competitions/${id}`),
  create: (competition: any) => apiClient.post('/competitions', competition),
  join: (id: string) => apiClient.post(`/competitions/${id}/join`),
};

export const leaderboardApi = {
  getGlobal: (limit?: number) =>
    apiClient.get('/leaderboard', { params: { limit } }),
  getCompetition: (id: string) =>
    apiClient.get(`/leaderboard/competition/${id}`),
};

export const adminApi = {
  listUsers: (params?: any) => apiClient.get('/admin/users', { params }),
  updateUser: (id: string, data: any) => apiClient.patch(`/admin/users/${id}`, data),
};

export default apiClient;

