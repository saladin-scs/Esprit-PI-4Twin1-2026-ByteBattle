/**
 * Point d'entrée API – réexporte le client core et toutes les APIs domaine.
 * Les modules auth, users, admin sont dans core/api ; les autres restent ici jusqu'à migration.
 */
import { apiClient, authApi, usersApi, adminApi } from '../core/api';
import type { ExecuteTestCase } from '../types/challenge';

export { apiClient, authApi, usersApi, adminApi };

export const challengesApi = {
  getAll: (params?: { page?: number; limit?: number; difficulty?: string; language?: string; search?: string; tag?: string }) =>
    apiClient.get('/challenges', { params }),
  getOne: (id: string) => apiClient.get(`/challenges/${id}`),
  run: (id: string, data: { code: string; language: string }) =>
    apiClient.post(`/challenges/${id}/run`, data),
  submit: (id: string, data: { code: string; language: string }) =>
    apiClient.post(`/challenges/${id}/submit`, data),
  getSolutions: (challengeId: string, params?: { page?: number; limit?: number; sortBy?: string }) =>
    apiClient.get(`/challenges/${challengeId}/solutions`, { params }),
  upvoteSolution: (solutionId: string) =>
    apiClient.post(`/challenges/solutions/${solutionId}/upvote`, {}),
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



export default apiClient;

