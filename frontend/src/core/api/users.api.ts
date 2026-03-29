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

  uploadAvatar: (formData: FormData, config?: any) =>
    apiClient.post('/users/me/avatar', formData, config),

  uploadCover: (formData: FormData, config?: any) =>
    apiClient.post('/users/me/cover', formData, config),

  /** Export JSON RGPD / portabilité (données liées au compte). */
  dataExport: () => apiClient.get<Record<string, unknown>>('/users/me/data-export'),
};
