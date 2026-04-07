import { apiClient } from './client';

export const authApi = {
  login: (credentials: { email: string; password: string; rememberMe?: boolean }) =>
    apiClient.post('/auth/login', credentials),
  faceLogin: (data: { email: string; embedding: number[]; rememberMe?: boolean }) =>
    apiClient.post('/auth/face-login', data),
  verify2faLogin: (data: { twoFactorToken: string; code: string; rememberMe?: boolean }) =>
    apiClient.post('/auth/2fa/verify-login', data),
  register: (userData: {
    email: string;
    username: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    dateOfBirth?: string;
    newsletter?: boolean;
    referralSource?: string;
    faceDescriptor?: number[];
  }) => apiClient.post('/auth/register', userData),
  getProfile: () => apiClient.get('/auth/profile'),
  refresh: (refresh_token?: string) =>
    apiClient.post('/auth/refresh', refresh_token ? { refresh_token } : {}),
  logout: (refresh_token?: string) =>
    apiClient.post('/auth/logout', refresh_token ? { refresh_token } : {}),
  verifyEmail: (token: string) => apiClient.post('/auth/verify-email', { token }),
  resendVerification: (email: string) => apiClient.post('/auth/resend-verification', { email }),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
  twofaSetup: () => apiClient.post('/auth/2fa/setup'),
  twofaEnable: (code: string) => apiClient.post('/auth/2fa/enable', { code }),
  twofaDisable: (code: string) => apiClient.post('/auth/2fa/disable', { code }),
};
