import { create } from 'zustand';

type BattlePhase = 'loading' | 'waiting' | 'active' | 'done';

type BattleStoreState = {
  phase: BattlePhase;
  remainingSeconds: number;
  totalDurationSeconds: number;
  paused: boolean;
  opponentSubmitted: boolean;
  playerSubmissionMap: Record<string, boolean>;
  setPhase: (phase: BattlePhase) => void;
  setTimerTick: (payload: {
    remainingSeconds: number;
    totalDurationSeconds?: number;
    paused?: boolean;
    players?: Array<{ userId: string; submitted: boolean }>;
  }) => void;
  setOpponentSubmitted: (submitted: boolean) => void;
  reset: () => void;
};

const initialState = {
  phase: 'loading' as BattlePhase,
  remainingSeconds: 0,
  totalDurationSeconds: 0,
  paused: false,
  opponentSubmitted: false,
  playerSubmissionMap: {},
};

export const useBattleStore = create<BattleStoreState>((set) => ({
  ...initialState,
  setPhase: (phase) => set({ phase }),
  setTimerTick: (payload) =>
    set((state) => ({
      remainingSeconds: payload.remainingSeconds,
      totalDurationSeconds: payload.totalDurationSeconds ?? state.totalDurationSeconds,
      paused: payload.paused ?? false,
      playerSubmissionMap: payload.players
        ? payload.players.reduce<Record<string, boolean>>((acc, p) => {
            acc[p.userId] = !!p.submitted;
            return acc;
          }, {})
        : state.playerSubmissionMap,
    })),
  setOpponentSubmitted: (submitted) => set({ opponentSubmitted: submitted }),
  reset: () => set(initialState),
}));
