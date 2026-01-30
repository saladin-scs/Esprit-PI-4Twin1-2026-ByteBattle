import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_URL,
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
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  register: (userData: { email: string; username: string; password: string }) =>
    apiClient.post('/auth/register', userData),
  getProfile: () => apiClient.get('/auth/profile'),
};

export const challengesApi = {
  getAll: () => apiClient.get('/challenges'),
  getOne: (id: string) => apiClient.get(`/challenges/${id}`),
  create: (challenge: any) => apiClient.post('/challenges', challenge),
  generate: (data: { difficulty: string; topic: string }) =>
    apiClient.post('/challenges/generate', data),
};

export const codeExecutionApi = {
  execute: (data: { code: string; language: string; testCases: any[] }) =>
    apiClient.post('/code-execution/run', data),
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

export default apiClient;

