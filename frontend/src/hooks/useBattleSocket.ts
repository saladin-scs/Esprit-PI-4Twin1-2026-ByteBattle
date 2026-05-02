import { useCallback, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getSocketIoServerUrl } from '../config/publicEnv';

export type BattleQueueMode = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';

export type BattleTeamRoster = {
  teamIndex: number;
  members: Array<{ userId: string; username: string }>;
};

export type BattleFoundPayload = {
  battleId: string;
  challengeId: string;
  challengeTitle: string;
  durationSeconds: number;
  serverTime: string;
  mode?: BattleQueueMode;
  teams?: BattleTeamRoster[];
  yourTeamIndex?: number;
  opponent: { userId: string; username: string } | null;
};

export type BattleStartChallenge = {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  languages: string[];
  starterCode: Record<string, string>;
};

export type BattleStartPayload = {
  battleId: string;
  mode?: BattleQueueMode;
  teams?: BattleTeamRoster[];
  startedAt?: string;
  endsAt?: string;
  durationSeconds: number;
  challenge: BattleStartChallenge;
};

export type BattleResultPayload = {
  battleId: string;
  mode?: BattleQueueMode;
  winnerId: string | null;
  winnerTeamIndex?: number | null;
  teams?: BattleTeamRoster[];
  draw: boolean;
  finishReason?: string;
  startedAt?: string | null;
  endsAt?: string | null;
  finishedAt?: string | null;
  players: Array<{
    userId: string;
    username: string;
    teamIndex?: number;
    submitted: boolean;
    passed?: boolean;
    submissionTime: string | null;
    scoreBreakdown?: {
      passScore: number;
      submissionSpeedScore: number;
      executionEfficiencyScore: number;
      bonusScore: number;
      totalScore: number;
    };
  }>;
  submissions: Array<{
    userId: string;
    username?: string;
    language: string;
    passed: boolean;
    executionTimeMs: number;
    submittedAt?: string;
    overall: { passed: number; total: number } | null;
  }>;
  scoreWeights?: {
    passedAllTests: number;
    submissionSpeed: number;
    executionEfficiency: number;
    bonus: number;
  };
};

export type BattleTimerTickPayload = {
  battleId: string;
  remainingTime: number;
  remainingSeconds?: number;
  totalDurationSeconds: number;
  paused?: boolean;
  players: Array<{ userId: string; submitted: boolean }>;
  serverTime: string;
};

export function useBattleSocket(enabled: boolean) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setSocket(null);
      setConnected(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Authentication required');
      setSocket(null);
      return;
    }

    setError(null);
    const serverUrl = getSocketIoServerUrl();
    const s = serverUrl
      ? io(serverUrl, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 20,
          reconnectionDelay: 600,
        })
      : io({
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnectionAttempts: 20,
          reconnectionDelay: 600,
        });

    setSocket(s);

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', (err: Error) => {
      setError(err?.message || 'Connection failed');
    });
    s.on('error', (payload: { message?: string; code?: string }) => {
      if (payload?.message) {
        const code = payload.code ? `[${payload.code}] ` : '';
        setError(`${code}${payload.message}`);
      }
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [enabled]);

  const joinQueue = useCallback((mode: BattleQueueMode = '1v1') => {
    if (!socket?.connected) return Promise.resolve({ ok: false as const, error: 'Not connected' });
    return new Promise<{ ok: boolean; queued?: boolean; battleId?: string; error?: string }>((resolve) => {
      socket.emit('join_queue', { mode }, (ack: { ok: boolean; queued?: boolean; battleId?: string; error?: string }) => {
        resolve(ack);
      });
    });
  }, [socket]);

  const leaveQueue = useCallback(() => {
    socket?.emit('leave_queue', {});
  }, [socket]);

  const joinBattle = useCallback(
    (battleId: string) => {
      if (!socket?.connected) return Promise.resolve({ ok: false as const, error: 'Not connected' });
      return new Promise<{ ok: boolean; error?: string }>((resolve) => {
        socket.emit('join_battle', { battleId }, (ack: { ok: boolean; error?: string }) => resolve(ack));
      });
    },
    [socket],
  );

  const submitCode = useCallback(
    (battleId: string, code: string, language: string) => {
      if (!socket?.connected) return Promise.resolve({ ok: false as const, error: 'Not connected' });
      return new Promise<
        | { ok: true; passed: boolean; executionTimeMs: number; overall: { passed: number; total: number } }
        | { ok: false; error: string }
      >((resolve) => {
        socket.emit('submit_code', { battleId, code, language }, (ack: any) => {
          if (ack?.ok) resolve(ack);
          else resolve({ ok: false, error: ack?.error || 'Submit failed' });
        });
      });
    },
    [socket],
  );

  const leaveBattle = useCallback(
    (battleId: string) => {
      socket?.emit('leave_battle', { battleId });
    },
    [socket],
  );

  return {
    socket,
    connected,
    error,
    joinQueue,
    leaveQueue,
    joinBattle,
    submitCode,
    leaveBattle,
  };
}
