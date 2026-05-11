import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Loader2, ShieldCheck, Timer, Trophy, Users, Zap } from 'lucide-react';
import { battleApi } from '../../services/api';
import {
  useBattleSocket,
  type BattleFoundPayload,
  type BattleQueueMode,
  type BattleSocketConnectionState,
} from '../../hooks/useBattleSocket';
import { BattleNotification } from '../../components/Battle';

const LOBBY_SIZE: Record<BattleQueueMode, number> = {
  '1v1': 2,
  '2v2': 4,
  '3v3': 6,
  '4v4': 8,
  '5v5': 10,
};

function formatModeLabel(m: BattleQueueMode): string {
  switch (m) {
    case '1v1':
      return '1v1';
    case '2v2':
      return '2v2 (teams of 2)';
    case '3v3':
      return '3v3 (teams of 3)';
    case '4v4':
      return '4v4 (teams of 4)';
    case '5v5':
      return '5v5 (teams of 5)';
    default:
      return m;
  }
}

const MODE_OPTIONS: Array<{ mode: BattleQueueMode; title: string; subtitle: string; icon: typeof Users }> = [
  { mode: '1v1', title: 'Duel', subtitle: 'Fast head-to-head sprint', icon: Zap },
  { mode: '2v2', title: 'Squad', subtitle: 'Pair strategy and timing', icon: Users },
  { mode: '3v3', title: 'Trio', subtitle: 'Balanced team pressure', icon: ShieldCheck },
  { mode: '4v4', title: 'Strike Team', subtitle: 'Coordination-heavy format', icon: Trophy },
  { mode: '5v5', title: 'Full Team', subtitle: 'Maximum team competition', icon: Users },
];

export default function MatchmakingPage() {
  const navigate = useNavigate();
  const { socket, connected, connectionState, error, joinQueue, leaveQueue } = useBattleSocket(true);
  const [mode, setMode] = useState<BattleQueueMode>('1v1');
  const [queuedSince, setQueuedSince] = useState<number | null>(null);
  const [elapsedTick, setElapsedTick] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  type MatchPhase = 'idle' | 'searching' | 'matched' | 'navigating' | 'error';
  type MatchState = { phase: MatchPhase; battleId: string | null; error: string | null };
  type MatchAction =
    | { type: 'SEARCH_START' }
    | { type: 'MATCH_FOUND'; battleId: string }
    | { type: 'NAVIGATE' }
    | { type: 'SEARCH_CANCEL' }
    | { type: 'SEARCH_ERROR'; message: string };

  const [matchState, dispatch] = useReducer((state: MatchState, action: MatchAction): MatchState => {
    switch (action.type) {
      case 'SEARCH_START':
        return { phase: 'searching', battleId: null, error: null };
      case 'MATCH_FOUND':
        return { phase: 'matched', battleId: action.battleId, error: null };
      case 'NAVIGATE':
        return { ...state, phase: 'navigating' };
      case 'SEARCH_CANCEL':
        return { phase: 'idle', battleId: null, error: null };
      case 'SEARCH_ERROR':
        return { phase: 'error', battleId: null, error: action.message };
      default:
        return state;
    }
  }, { phase: 'idle', battleId: null, error: null });

  const goToBattle = useCallback(
    (battleId: string) => {
      dispatch({ type: 'MATCH_FOUND', battleId });
      dispatch({ type: 'NAVIGATE' });
      setQueuedSince(null);
      setStatus('Match found. Redirecting...');
      navigate(`/battle/room/${battleId}`);
    },
    [navigate],
  );

  const queued = matchState.phase === 'searching';
  const busy = matchState.phase === 'searching' || matchState.phase === 'matched' || matchState.phase === 'navigating';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await battleApi.getPending();
        if (cancelled || !data.battle) return;
        goToBattle(data.battle.battleId);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [goToBattle]);

  useEffect(() => {
    if (!socket) return;
    const onFound = (payload: BattleFoundPayload) => {
      if (payload?.battleId) goToBattle(payload.battleId);
    };
    socket.on('battle_found', onFound);
    return () => {
      socket.off('battle_found', onFound);
    };
  }, [socket, goToBattle]);

  useEffect(() => {
    if (!queued) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus('Still searching. You can keep waiting or leave queue and retry.');
    }, 20000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [queued]);

  useEffect(() => {
    if (!queuedSince) return;
    const t = window.setInterval(() => setElapsedTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [queuedSince]);

  const handleFindMatch = async () => {
    dispatch({ type: 'SEARCH_START' });
    setQueuedSince(Date.now());
    setStatus(null);
    try {
      if (connected) {
        const ack = await joinQueue(mode);
        if (!ack.ok) {
          const message = ack.error || 'Could not join queue';
          setStatus(message);
          dispatch({ type: 'SEARCH_ERROR', message });
        } else if (ack.battleId) {
          goToBattle(ack.battleId);
        } else {
          setStatus('Queued in realtime matchmaking. Waiting for players...');
        }
        return;
      }
      const http = await battleApi.joinQueueHttp({ mode });
      if (http.data.battleId) {
        goToBattle(http.data.battleId);
        return;
      }
      if (!http.data.queued) {
        const message = 'Unable to queue for matchmaking';
        dispatch({ type: 'SEARCH_ERROR', message });
        setStatus(message);
        return;
      }
      setStatus(
        'Real-time is offline — you are in the HTTP queue. This page will poll for a match every few seconds.',
      );
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const { data } = await battleApi.getPending();
            if (data.battle?.battleId) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              goToBattle(data.battle.battleId);
            }
          } catch {
            /* ignore */
          }
        })();
      }, 4000);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Matchmaking failed';
      setStatus(message);
      dispatch({ type: 'SEARCH_ERROR', message });
    }
  };

  const handleCancel = () => {
    leaveQueue();
    if (!connected) {
      void battleApi.cancelQueueHttp().catch(() => undefined);
    }
    dispatch({ type: 'SEARCH_CANCEL' });
    setQueuedSince(null);
    setStatus(null);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const selectedOption = MODE_OPTIONS.find((o) => o.mode === mode) ?? MODE_OPTIONS[0];
  const queuePrompt =
    mode === '1v1' ? 'Waiting for another player…' : `Waiting for ${LOBBY_SIZE[mode] - 1} more players (${mode})…`;
  void elapsedTick;
  const waitSeconds = queuedSince ? Math.floor((Date.now() - queuedSince) / 1000) : 0;
  const connectionMessageByState: Record<BattleSocketConnectionState, string> = {
    idle: 'Socket is idle.',
    connecting: 'Establishing real-time connection...',
    connected: 'Real-time connected.',
    reconnecting: 'Reconnecting realtime channel...',
    error: 'Socket unavailable; using HTTP fallback queue.',
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
      <section className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/85 sm:p-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
              <Swords className="h-3.5 w-3.5" aria-hidden />
              PvP Matchmaking
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Coding battles</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Select a format and queue into a server-authoritative battle. All players receive the same challenge and
              are graded under the same timer constraints.
            </p>
          </div>
          <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected mode</p>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{formatModeLabel(mode)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedOption.subtitle}</p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section aria-label="Battle modes">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Modes</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Battle mode">
              {MODE_OPTIONS.map(({ mode: optionMode, title, subtitle, icon: Icon }) => {
                const active = mode === optionMode;
                return (
                  <button
                    key={optionMode}
                    role="radio"
                    aria-checked={active}
                    type="button"
                    disabled={queued || busy}
                    onClick={() => setMode(optionMode)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? 'border-indigo-500 bg-indigo-50/80 shadow-sm dark:border-indigo-400 dark:bg-indigo-500/15'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-slate-600 dark:hover:bg-slate-900'
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{optionMode}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 dark:border-slate-700 dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Queue status</h2>
            <div className="mt-4 space-y-3">
              {!connected ? (
                <BattleNotification
                  tone="warning"
                  title="Realtime not ready"
                  message={connectionMessageByState[connectionState]}
                />
              ) : (
                <BattleNotification
                  tone="success"
                  title="Real-time connected"
                  message="Match found events will navigate you instantly."
                />
              )}

              {error ? <BattleNotification tone="error" title="Connection issue" message={error} /> : null}
              {status ? <BattleNotification tone="info" title="Matchmaking update" message={status} /> : null}
              {matchState.error ? <BattleNotification tone="error" title="Queue error" message={matchState.error} /> : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-600 dark:text-slate-300">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                <p className="font-semibold">Lobby size</p>
                <p className="mt-1">{LOBBY_SIZE[mode]} players</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                <p className="font-semibold">Queue type</p>
                <p className="mt-1">{connected ? 'Socket + HTTP backup' : 'HTTP polling fallback'}</p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {!queued ? (
                <button
                  type="button"
                  onClick={() => void handleFindMatch()}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Swords className="h-5 w-5" aria-hidden />}
                  Find match
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:focus:ring-offset-slate-950"
                >
                  Leave queue
                </button>
              )}

              {queued && (
                <p className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {queuePrompt} {waitSeconds > 0 ? `(${waitSeconds}s)` : ''}
                </p>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-8 grid gap-3 sm:grid-cols-3" aria-label="Matchmaking details">
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Timer className="h-3.5 w-3.5" aria-hidden />
              Server timer
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Battle countdown and scoring are synced by backend events.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Team assignment
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Teams fill in queue order: first half vs second half.</p>
          </article>
          <article className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/70">
            <p className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Trophy className="h-3.5 w-3.5" aria-hidden />
              Result ranking
            </p>
            <p className="text-sm text-slate-700 dark:text-slate-300">Winners are calculated with pass, speed, execution, and bonus weights.</p>
          </article>
        </section>
      </section>
    </main>
  );
}
