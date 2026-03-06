/**
 * Point d'entrée API – réexporte le client core et toutes les APIs domaine.
 * Les modules auth, users, admin sont dans core/api ; les autres restent ici jusqu'à migration.
 */
import { apiClient, authApi, usersApi, adminApi } from '../core/api';
import type { ExecuteTestCase } from '../types/challenge';
import axios from 'axios';
export { apiClient, authApi, usersApi, adminApi };

export const challengesApi = {
  getAll: () => apiClient.get('/challenges'),
  getOne: (id: string) => apiClient.get(`/challenges/${id}`),
  create: (challenge: any) => apiClient.post('/challenges', challenge),
  generate: (data: { difficulty: string; topic: string }) =>
    apiClient.post('/challenges/generate', data),
};
const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

API.interceptors.request.use((req) => {
  if (localStorage.getItem("token")) {
    req.headers.Authorization =
      `Bearer ${localStorage.getItem("token")}`;
  }
  return req;
});

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
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {config.headers.Authorization = `Bearer ${token}`;}
  else {
      console.warn('No token found in localStorage'); // optional debug
    }
  return config;
});


export default apiClient;

