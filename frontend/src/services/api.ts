/**
 * API entry point - re-exports core client and all domain APIs.
 * auth/users/admin modules are in core/api; others stay here until migration.
 */
import { apiClient } from '../core/api';
import type { ExecuteTestCase } from '../types/challenge';
import type { FeedbackResponse } from '../types/feedback';

export {
  apiClient,
  authApi,
  usersApi,
  adminApi,
  type AdminReclamationRow,
} from '../core/api';

export type RecommendedChallengeItem = {
  id: string;
  title: string;
  difficulty: string;
  tags: string[];
  xpReward?: number;
  languages?: string[];
};

export const challengesApi = {
  getAll: (params?: { page?: number; limit?: number; difficulty?: string; language?: string; search?: string; tag?: string }) =>
    apiClient.get('/challenges', { params }),
  getRecommended: (params?: { limit?: number }) =>
    apiClient.get<{ challenges: RecommendedChallengeItem[] }>('/challenges/recommended', { params }),
  getRecommendations: (userId: string, params?: { limit?: number }) =>
    apiClient.get<{ challenges: RecommendedChallengeItem[] }>(`/recommendations/${userId}`, { params }),
  getSimilar: (itemId: string, params?: { limit?: number }) =>
    apiClient.get<{ challenges: RecommendedChallengeItem[] }>(`/recommendations/item/${itemId}`, { params }),
  trackEngagement: (data: {
    userId: string;
    itemId: string;
    eventType: 'click' | 'dwell' | 'scroll' | 'impression';
    value?: number;
    context?: any;
  }) => apiClient.post('/recommendations/track', data),
  getOne: (id: string) => apiClient.get(`/challenges/${id}`),
  getOneAdmin: (id: string) => apiClient.get(`/challenges/admin/${id}`),
  getChallengeAnalytics: (id: string) =>
    apiClient.get(`/challenges/admin/${id}/analytics`),
  getChallengeStats: (id: string) =>
    apiClient.get(`/challenges/${id}/stats`),
  getMyCompletion: (id: string) => apiClient.get<{ completedLanguages: string[] }>(`/challenges/${id}/my-completion`),
  getChallengeProgress: (id: string) =>
    apiClient.get<{
      solved: boolean;
      startedAt: string | null;
      revealedHintIndices: number[];
    }>(`/challenges/${id}/progress`),
  revealChallengeHint: (id: string, hintIndex: number) =>
    apiClient.post<{ startedAt: string; revealedHintIndices: number[] }>(`/challenges/${id}/progress/reveal-hint`, {
      hintIndex,
    }),
  run: (id: string, data: { code: string; language: string }) =>
    apiClient.post(`/challenges/${id}/run`, data),
  submit: (id: string, data: { code: string; language: string }) =>
    apiClient.post(`/challenges/${id}/submit`, data),
  getMySubmissions: (challengeId?: string) =>
    apiClient.get('/challenges/me/submissions', { params: { challengeId } }),
  getMyHistory: (id: string) =>
    apiClient.get(`/challenges/${id}/my-history`),
  getOfficialSolution: (id: string, params?: { language?: string }) =>
    apiClient.get(`/challenges/${id}/official-solution`, { params }),
  getSolutions: (challengeId: string, params?: { page?: number; limit?: number; sortBy?: string }) =>
    apiClient.get(`/challenges/${challengeId}/solutions`, { params }),
  upvoteSolution: (solutionId: string) =>
    apiClient.post(`/challenges/solutions/${solutionId}/upvote`, {}),
  create: (challenge: any) => apiClient.post('/challenges', challenge),
  generateWithAi: (payload: {
    prompt: string;
    difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
    languages?: Array<'javascript' | 'python' | 'java' | 'cpp'>;
    tags?: string[];
    create?: boolean;
    isPublished?: boolean;
  }) => apiClient.post<{ draft: any; created?: any }>('/challenges/ai-generate', payload),
analyzeCode: (data: {
  code: string;
  language: string;
  taskDescription?: string;
  testsPassed?: boolean;
  testsPassedCount?: number;
  testsTotal?: number;
  executionError?: string;
  runtimeMs?: number;
}) => apiClient.post<FeedbackResponse>('/ai/analyze-code', data),

 update: (id: string, challenge: any) => apiClient.patch(`/challenges/${id}`, challenge),
  delete: (id: string) => apiClient.delete(`/challenges/${id}`),
};


export const codeExecutionApi = {
  execute: (data: { code: string; language: string; testCases: ExecuteTestCase[] }) =>
    apiClient.post('/code-execution/run', data),
};

export const battleApi = {
  getPending: () =>
    apiClient.get<{
      battle: null | {
        battleId: string;
        status: string;
        challengeId: string;
        durationSeconds: number;
        startedAt: string | null;
        endsAt: string | null;
      };
    }>('/battle/pending'),
  joinQueueHttp: (body?: { mode?: '1v1' | '2v2' | '3v3' | '4v4' | '5v5' }) =>
    apiClient.post<{ queued: boolean; battleId?: string; challengeId?: string }>('/battle/queue', body ?? {}),
  cancelQueueHttp: () => apiClient.post<{ ok: true }>('/battle/queue/cancel', {}),
  joinBattleHttp: (id: string) =>
    apiClient.post<{
      battleId: string;
      status: string;
      challengeId: string;
      durationSeconds: number;
      startedAt: string | null;
      endsAt: string | null;
    }>(`/battle/${id}/join`),
  getSummary: (id: string) => apiClient.get(`/battle/${id}/summary`),
};

export const chatApi = {
  getHistory: (room: string, params?: { limit?: number; before?: string }) =>
    apiClient.get<{ room: string; messages: Array<{
      id: string;
      room: string;
      userId: string;
      username: string;
      body: string;
      createdAt: string;
    }> }>('/chat/history', { params: { room, ...params } }),
  reportMessage: (body: { messageId: string; room: string; reason?: string }) =>
    apiClient.post<{ ok: true }>('/chat/report', body),
};

/** Site rating: 1 to 5 stars. */
export const SITE_RATING_MAX_STARS = 5;

export const siteRatingsApi = {
  getStats: () =>
    apiClient.get<{ average: number; count: number; maxStars: number }>('/site-ratings/stats'),
  getMe: () => apiClient.get<{ stars: number | null }>('/site-ratings/me'),
  setRating: (stars: number) =>
    apiClient.post<{ ok: true; stars: number }>('/site-ratings', { stars }),
};

export type ReclamationCategory = 'bug' | 'account' | 'content' | 'harassment' | 'other';
export type ReclamationStatus = 'open' | 'read' | 'resolved' | 'cancelled';

export type ReclamationMineItem = {
  id: string;
  category: ReclamationCategory;
  subject: string;
  message: string;
  status: ReclamationStatus;
  createdAt: string;
};

export const reclamationsApi = {
  create: (data: {
    category?: ReclamationCategory;
    subject: string;
    message: string;
  }) => apiClient.post<{ ok: true; id: string }>('/reclamations', data),
  listMine: (params?: {
    page?: number;
    limit?: number;
    status?: ReclamationStatus;
    category?: ReclamationCategory;
    q?: string;
    sort?: 'newest' | 'oldest';
  }) =>
    apiClient.get<{
      items: ReclamationMineItem[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>('/reclamations/me', { params }),
  getMine: (id: string) => apiClient.get<ReclamationMineItem>(`/reclamations/me/${id}`),
  cancelMine: (id: string) =>
    apiClient.patch<{ ok: true; reclamation: ReclamationMineItem }>(`/reclamations/me/${id}/cancel`),
};

export const feedbackApi = {
  analyze: (data: {
    code: string;
    language?: string;
    tests_passed?: boolean;
    tests_passed_count?: number;
    tests_total?: number;
    execution_error?: string;
    runtime_ms?: number;
    memory_kb?: number;
    task_description?: string;
  }) => apiClient.post('/ai/analyze-code', data),
};

export const competitionsApi = {
  getAll: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/competitions', { params }),
  getHistory: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/competitions/history', { params }),
  getOne: (id: string) => apiClient.get(`/competitions/${id}`),
  getLeaderboard: (id: string, params?: { language?: string; limit?: number }) =>
    apiClient.get(`/competitions/${id}/leaderboard`, { params }),
  create: (competition: any) => apiClient.post('/competitions', competition),
  run: (id: string, data: { code: string; language: string; challengeId?: string }) =>
    apiClient.post(`/competitions/${id}/run`, data),
  join: (id: string) => apiClient.post(`/competitions/${id}/join`),
  submit: (id: string, data: { code: string; language: string; challengeId?: string }) =>
    apiClient.post(`/competitions/${id}/submit`, data),
  backfillChallenges: () =>
    apiClient.post<{
      updated: Array<{ id: string; name: string; challengeIds: string[] }>;
      skipped: Array<{ id: string; name: string }>;
    }>('/competitions/admin/backfill-challenges'),
  updateStatus: (id: string, status: 'scheduled' | 'active' | 'closed' | 'archived') =>
    apiClient.put(`/competitions/${id}/status`, { status }),
};

export const leaderboardApi = {
  getGlobal: (limit?: number) =>
    apiClient.get('/leaderboard', { params: { limit } }),
  getCompetition: (id: string) =>
    apiClient.get(`/leaderboard/competition/${id}`),
};

/** Gamification (XP, streaks, badges, leaderboard) */
export const gamificationApi = {
  getCatalog: () => apiClient.get('/gamification/catalog'),
  getMe: () =>
    apiClient.get('/gamification/me', {
      params: { _ts: Date.now() },
      headers: { 'Cache-Control': 'no-store, no-cache', Pragma: 'no-cache' },
    }),
  dailyLogin: () => apiClient.post('/gamification/daily-login'),
  streakFreeze: () => apiClient.post('/gamification/streak-freeze'),
  getLeaderboard: (params?: { page?: number; limit?: number; country?: string }) =>
    apiClient.get('/gamification/leaderboard', { params }),
};

export type ExploreSearchResult = {
  query: string;
  challenges: Array<{
    id: string;
    title: string;
    difficulty: string;
    tags: string[];
    xpReward?: number;
  }>;
  competitions: Array<{
    id: string;
    name: string;
    status: string;
    type?: string;
    startTime?: string;
    endTime?: string;
  }>;
  users: Array<{
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  }>;
};

export const exploreApi = {
  search: (params?: { q?: string; limit?: number }) =>
    apiClient.get<ExploreSearchResult>('/explore', { params }),
};

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  meta: { href?: string; challengeId?: string; competitionId?: string };
  createdAt: string;
};

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{
      items: NotificationItem[];
      total: number;
      unreadCount: number;
      page: number;
      totalPages: number;
    }>('/notifications', {
      params: { ...params, _ts: Date.now() },
      headers: { 'Cache-Control': 'no-store, no-cache', Pragma: 'no-cache' },
    }),
  markRead: (id: string) => apiClient.patch<{ ok: true }>(`/notifications/${id}/read`, {}),
  markAllRead: () => apiClient.patch<{ ok: true }>('/notifications/read-all', {}),
};

export type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export const apiKeysApi = {
  create: (name: string) =>
    apiClient.post<{ id: string; name: string; secret: string; prefix: string; createdAt: string }>(
      '/api-keys',
      { name },
    ),
  list: () => apiClient.get<{ keys: ApiKeyRow[] }>('/api-keys'),
  revoke: (id: string) => apiClient.delete<{ ok: true }>(`/api-keys/${id}`),
};

export default apiClient;

