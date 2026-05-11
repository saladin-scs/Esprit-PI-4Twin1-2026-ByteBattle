/**
 * Zustand store: gamification summary (XP, rank, badges, progress).
 * Refreshed after login, daily claim, and successful challenge submission.
 * Dashboard and SubmissionSuccessModal read from here.
 */
import { create } from 'zustand';

export interface RankProgress {
  currentTier: string;
  nextTier: string | null;
  xpInTier: number;
  xpNeededForNext: number;
  progressFraction: number;
}

export interface GamificationSummary {
  xp: number;
  rankTier: string;
  rankProgress?: RankProgress;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  streakFreezes: number;
  totalChallengesSolved: number;
  problemsByDifficulty: { easy: number; medium: number; hard: number; expert: number };
  languageStats: Record<string, number>;
  badgeIds: string[];
  lastUnlockedBadge: { badgeId: string; name: string } | null;
  canClaimDailyLogin: boolean;
  canClaimFirstSolveOfDay: boolean;
  myRank: number | null;
  totalRanked: number;
  username?: string;
}

interface GamificationState {
  summary: GamificationSummary | null;
  loading: boolean;
  error: string | null;
  setSummary: (s: GamificationSummary | null) => void;
  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;
  fetchSummary: () => Promise<GamificationSummary | null>;
  reset: () => void;
}

export const useGamificationStore = create<GamificationState>((set) => ({
  summary: null,
  loading: false,
  error: null,

  setSummary: (s) => set({ summary: s, error: null }),
  setLoading: (v) => set({ loading: v }),
  setError: (e) => set({ error: e }),

  fetchSummary: async () => {
    set({ loading: true, error: null });
    try {
      const { gamificationApi } = await import('../services/api');
      const res = await gamificationApi.getMe();
      const data = res.data as GamificationSummary;
      set({ summary: data, loading: false, error: null });
      return data;
    } catch {
      set({ loading: false, error: 'Failed to load progress.' });
      return null;
    }
  },

  reset: () => set({ summary: null, loading: false, error: null }),
}));
