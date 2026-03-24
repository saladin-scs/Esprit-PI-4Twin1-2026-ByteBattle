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
  createdAt: string;
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
      const data = res.data as {
        challenges: ChallengeListItem[];
        total: number;
        totalPages: number;
      };
      set({
        challenges: data.challenges ?? [],
        total: data.total ?? 0,
        totalPages: data.totalPages ?? 1,
        loading: false,
        error: null,
      });
    } catch {
      set({
        loading: false,
        error: 'Failed to load challenges.',
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
