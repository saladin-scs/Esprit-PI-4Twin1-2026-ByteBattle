/**
 * Zustand store: challenges list, filters, pagination.
 * Single source of truth for the challenges list page.
 */
import { create } from 'zustand';

const PAGE_SIZE = 15;

export interface ChallengeListItem {
  _id: string;
  title: string;
  difficulty: string;
  languages: string[];
  tags: string[];
  xpReward: number;
  totalSubmissions: number;
  totalAccepted: number;
  /** ISO date - fallback for "new" badge if API does not send isNew */
  createdAt?: string;
  /** Set by API (created less than CHALLENGE_NEW_DAYS days ago) */
  isNew?: boolean;
}

interface ChallengesState {
  challenges: ChallengeListItem[];
  total: number;
  totalPages: number;
  page: number;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    difficulty: string;
    language: string;
  };
  setFilters: (partial: Partial<ChallengesState['filters']>) => void;
  setPage: (page: number) => void;
  fetchChallenges: () => Promise<void>;
  reset: () => void;
}

const initialFilters = { search: '', difficulty: 'All', language: 'All' };

export const useChallengesStore = create<ChallengesState>((set, get) => ({
  challenges: [],
  total: 0,
  totalPages: 1,
  page: 1,
  loading: false,
  error: null,
  filters: initialFilters,

  setFilters: (partial) =>
    set((s) => ({
      filters: { ...s.filters, ...partial },
      page: 1,
    })),

  setPage: (page) => set({ page }),

  fetchChallenges: async () => {
    set({ loading: true, error: null });
    const { page, filters } = get();
    try {
      const { challengesApi } = await import('../services/api');
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_SIZE,
      };
      if (filters.difficulty !== 'All') params.difficulty = filters.difficulty;
      if (filters.language !== 'All') params.language = filters.language;
      if (filters.search.trim()) params.search = filters.search.trim();

      const res = await challengesApi.getAll(params);
      const payload = (res.data && typeof res.data === 'object' ? (res.data as any).data ?? res.data : {}) as Record<string, any>;
      const challengesList = Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload?.challenges)
        ? payload.challenges
        : [];
      const total = typeof payload?.total === 'number' ? payload.total : 0;
      const totalPages = typeof payload?.totalPages === 'number'
        ? payload.totalPages
        : typeof payload?.limit === 'number' && total > 0
        ? Math.max(1, Math.ceil(total / payload.limit))
        : 1;
      set({
        challenges: Array.isArray(challengesList) ? challengesList : [],
        total,
        totalPages,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
          ? (err.response as { data?: { message?: string } }).data?.message
          : err instanceof Error
            ? err.message
            : 'Failed to load challenges.';
      set({
        loading: false,
        error: Array.isArray(message) ? message.join(', ') : message || 'Failed to load challenges.',
      });
    }
  },

  reset: () =>
    set({
      challenges: [],
      total: 0,
      totalPages: 1,
      page: 1,
      filters: initialFilters,
      error: null,
    }),
}));
