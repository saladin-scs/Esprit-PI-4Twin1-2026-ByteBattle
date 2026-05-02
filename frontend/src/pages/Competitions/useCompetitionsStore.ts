/**
 * Zustand store for competitions list: tabs, data, loading, error.
 * Follows the same pattern as challengesStore.
 */
import { create } from 'zustand';
import type { CompetitionListItem, CompetitionTab } from './types';

const LIMIT = 50;

type CompetitionsQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'code_golf' | 'speed' | 'algorithmic';
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  language?: 'javascript' | 'python' | 'java' | 'cpp';
  sortBy?: 'startTime' | 'endTime' | 'submissions';
  sortOrder?: 'asc' | 'desc';
};

interface CompetitionsState {
  tab: CompetitionTab;
  competitions: CompetitionListItem[];
  total: number;
  page: number;
  totalPages: number;
  lastQuery: CompetitionsQueryParams;
  loading: boolean;
  error: string | null;
  setTab: (tab: CompetitionTab) => void;
  fetchCompetitions: (params?: CompetitionsQueryParams) => Promise<void>;
  joinCompetition: (id: string) => Promise<void>;
  reset: () => void;
}

const getStatusForTab = (
  tab: CompetitionTab,
): 'scheduled' | 'active' | 'closed' | 'archived' =>
  tab === 'active' ? 'active' : tab === 'scheduled' ? 'scheduled' : 'closed';

const initialState = {
  competitions: [] as CompetitionListItem[],
  total: 0,
  page: 1,
  totalPages: 1,
  lastQuery: {},
  loading: false,
  error: null as string | null,
};

export const useCompetitionsStore = create<CompetitionsState>((set, get) => ({
  tab: 'active',
  ...initialState,

  setTab: (tab) => set({ tab }),

  fetchCompetitions: async (params) => {
    set({ loading: true, error: null });
    const { tab } = get();
    const status = getStatusForTab(tab);
    const nextQuery = params ?? get().lastQuery;
    try {
      const { competitionsApi } = await import('../../services/api');
      const res = await competitionsApi.getAll({ status, page: 1, limit: LIMIT, ...nextQuery });
      const data = res.data as {
        competitions: CompetitionListItem[];
        total: number;
        page?: number;
        totalPages?: number;
      };
      set({
        competitions: data.competitions ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        totalPages: data.totalPages ?? 1,
        lastQuery: nextQuery,
        loading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response
          ? (err.response as { data?: { message?: string } }).data?.message
          : err instanceof Error
            ? err.message
            : 'Failed to load competitions';
      set({ ...initialState, loading: false, error: message });
    }
  },

  joinCompetition: async (id: string) => {
    try {
      const { competitionsApi } = await import('../../services/api');
      await competitionsApi.join(id);
      // Refetch to get updated participants count
      get().fetchCompetitions(get().lastQuery);
    } catch (err: unknown) {
      console.error('Failed to join contest', err);
      throw err;
    }
  },

  reset: () => set({ ...initialState, tab: get().tab }),
}));
