/**
 * Couche API modulaire – chaque domaine expose son API.
 * Un seul client HTTP partagé (client.ts).
 */

export { apiClient, default } from './client';
export { authApi } from './auth.api';
export { usersApi } from './users.api';
export { adminApi } from './admin.api';
