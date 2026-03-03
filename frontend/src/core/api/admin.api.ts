import { apiClient } from './client';

export const adminApi = {
  listUsers: (params?: Record<string, unknown>) => apiClient.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/users/${id}`, data),
};
