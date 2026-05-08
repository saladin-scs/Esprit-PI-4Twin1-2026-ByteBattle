/**
 * Zustand store: current challenge detail, selected language, code, completion.
 * Used by ChallengeDetail and LanguagePicker. Completion = solved per language.
 */
import { create } from 'zustand';

export interface ChallengeDetailChallenge {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  tags: string[];
  xpReward: number;
  starterCode: Record<string, string>;
  hints?: Array<{ text: string; tier: string; cost: number }>;
}

interface ChallengeDetailState {
  challenge: ChallengeDetailChallenge | null;
  selectedLang: string;
  code: string;
  completedLanguages: string[];
  loadingChallenge: boolean;
  loadingCompletion: boolean;
  error: string | null;
  setChallenge: (c: ChallengeDetailChallenge | null) => void;
  setSelectedLang: (lang: string) => void;
  setCode: (code: string) => void;
  setCompletedLanguages: (langs: string[]) => void;
  setLoadingChallenge: (v: boolean) => void;
  setLoadingCompletion: (v: boolean) => void;
  setError: (e: string | null) => void;
  isSolved: (lang: string) => boolean;
  reset: () => void;
}

const initialState = {
  challenge: null,
  selectedLang: 'javascript',
  code: '',
  completedLanguages: [],
  loadingChallenge: false,
  loadingCompletion: false,
  error: null,
};

export const useChallengeDetailStore = create<ChallengeDetailState>((set, get) => ({
  ...initialState,

  setChallenge: (c) => set({ challenge: c }),

  setSelectedLang: (lang) => {
    const { challenge } = get();
    const code = challenge?.starterCode?.[lang] ?? '';
    set({ selectedLang: lang, code });
  },

  setCode: (code) => set({ code }),

  setCompletedLanguages: (langs) => set({ completedLanguages: langs }),

  setLoadingChallenge: (v) => set({ loadingChallenge: v }),

  setLoadingCompletion: (v) => set({ loadingCompletion: v }),

  setError: (e) => set({ error: e }),

  isSolved: (lang) => get().completedLanguages.includes(lang),

  reset: () => set(initialState),
}));
