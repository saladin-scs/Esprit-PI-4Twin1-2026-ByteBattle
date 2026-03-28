import { apiClient } from './client';

export const adminApi = {
  listUsers: (params?: Record<string, unknown>) => apiClient.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/users/${id}`, data),
  setUserRole: (id: string, role: 'user' | 'moderator' | 'admin') =>
    apiClient.patch(`/admin/users/${id}/role`, { role }),
  getGamificationStats: () => apiClient.get('/admin/gamification/stats'),
  getChatReports: (params?: { page?: number; limit?: number; status?: 'open' | 'reviewed' }) =>
    apiClient.get<{ total: number; items: Array<Record<string, unknown>> }>('/admin/chat-reports', {
      params,
    }),
};
