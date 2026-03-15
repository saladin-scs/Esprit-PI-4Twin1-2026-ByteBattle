/**
 * Zustand store for competitions list: tabs, data, loading, error.
 * Follows the same pattern as challengesStore.
 */
import { create } from 'zustand';
import type { CompetitionListItem, CompetitionTab } from './types';

const LIMIT = 50;

interface CompetitionsState {
  tab: CompetitionTab;
  competitions: CompetitionListItem[];
  total: number;
  loading: boolean;
  error: string | null;
  setTab: (tab: CompetitionTab) => void;
  fetchCompetitions: () => Promise<void>;
  reset: () => void;
}

const getStatusForTab = (tab: CompetitionTab): string =>
  tab === 'active' ? 'active' : tab === 'scheduled' ? 'scheduled' : 'closed';

const initialState = {
  competitions: [] as CompetitionListItem[],
  total: 0,
  loading: false,
  error: null as string | null,
};

export const useCompetitionsStore = create<CompetitionsState>((set, get) => ({
  tab: 'active',
  ...initialState,

  setTab: (tab) => set({ tab }),

  fetchCompetitions: async () => {
    set({ loading: true, error: null });
    const { tab } = get();
    const status = getStatusForTab(tab);
    try {
      const { competitionsApi } = await import('../../services/api');
      const res = await competitionsApi.getAll({ status, page: 1, limit: LIMIT });
      const data = res.data as { competitions: CompetitionListItem[]; total: number };
      set({
        competitions: data.competitions ?? [],
        total: data.total ?? 0,
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

  reset: () => set({ ...initialState, tab: get().tab }),
}));
