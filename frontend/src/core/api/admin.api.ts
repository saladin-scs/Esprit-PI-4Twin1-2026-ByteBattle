import { apiClient } from './client';

export type AdminReclamationRow = {
  id: string;
  userId: string;
  userEmail?: string;
  username?: string;
  category: string;
  subject: string;
  message: string;
  status: 'open' | 'read' | 'resolved' | 'cancelled';
  createdAt: string;
};

export type AdminReclamationSummary = {
  total: number;
  unresolved: number;
  staleUnresolved: number;
  byStatus: Record<'open' | 'read' | 'resolved' | 'cancelled', number>;
  byCategory: Record<'bug' | 'account' | 'content' | 'harassment' | 'other', number>;
};

export const adminApi = {
  listUsers: (params?: Record<string, unknown>) => apiClient.get('/admin/users', { params }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    apiClient.patch(`/admin/users/${id}`, data),
  setUserRole: (id: string, role: 'user' | 'moderator' | 'admin') =>
    apiClient.patch(`/admin/users/${id}/role`, { role }),
  getGamificationStats: () => apiClient.get('/admin/gamification/stats'),
  getChatReports: (params?: { page?: number; limit?: number; status?: 'open' | 'reviewed' }) =>
    apiClient.get('/admin/chat-reports', { params }),
  listReclamations: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    q?: string;
    sort?: 'newest' | 'oldest';
  }) =>
    apiClient.get<{
      items: AdminReclamationRow[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/admin/reclamations', { params }),
  getReclamationSummary: () => apiClient.get<AdminReclamationSummary>('/admin/reclamations/summary'),
  patchReclamationStatus: (
    id: string,
    status: 'open' | 'read' | 'resolved' | 'cancelled',
  ) =>
    apiClient.patch<{ ok: true; reclamation: AdminReclamationRow }>(`/admin/reclamations/${id}`, {
      status,
    }),
};
