/**
 * Modular API layer - each domain exposes its API.
 * One shared HTTP client (client.ts).
 */

export { apiClient, default } from './client';
export { authApi } from './auth.api';
export { usersApi } from './users.api';
export { adminApi } from './admin.api';
export type { AdminReclamationRow, AdminReclamationSummary } from './admin.api';
