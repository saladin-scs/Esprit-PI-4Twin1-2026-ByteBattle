import { apiClient } from './client';
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000', // 👈 this should be set
});

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
  uploadAvatar: (formData: FormData) => api.post('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  uploadCover: (formData: FormData) => api.post('/users/cover', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};
