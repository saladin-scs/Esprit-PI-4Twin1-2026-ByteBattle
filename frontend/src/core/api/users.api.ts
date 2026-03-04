import { apiClient } from './client';

export const usersApi = {
  me: () => apiClient.get('/users/me'),
  updateMe: (data: Record<string, unknown> | object) => apiClient.put('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/users/me/change-password', data),
  myStats: () => apiClient.get('/users/me/stats'),
  myActivity: () => apiClient.get('/users/me/activity'),
  mySkillTree: () => apiClient.get('/users/me/skill-tree'),
  newBadge: () => apiClient.get('/users/me/new-badge'),
  publicByUsername: (username: string) => apiClient.get(`/users/public/${username}`),
  publicActivity: (username: string) => apiClient.get(`/users/public/${username}/activity`),
  publicSkillTree: (username: string) => apiClient.get(`/users/public/${username}/skill-tree`),
};
