import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Editor from '@monaco-editor/react';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';
import {
  useBattleSocket,
  type BattleStartPayload,
  type BattleResultPayload,
  type BattleTimerTickPayload,
  type BattleTeamRoster,
} from '../../hooks/useBattleSocket';
import { RootState } from '../../store/store';
import { useBattleStore } from '../../stores/battleStore';
import { BattleTimer } from './BattleTimer';
import { battleApi } from '../../services/api';

function isRivalSubmission(payload: BattleStartPayload | null, myId: string, otherUserId: string): boolean {
  if (!myId || !otherUserId) return false;
  if (!payload?.teams?.length) return otherUserId !== myId;
  const flat = payload.teams.flatMap((t: BattleTeamRoster) =>
    t.members.map((m) => ({ ...m, teamIndex: t.teamIndex })),
  );
  const me = flat.find((m) => m.userId === myId);
  const them = flat.find((m) => m.userId === otherUserId);
  if (!me || !them) return otherUserId !== myId;
  return me.teamIndex !== them.teamIndex;
}

function didMyTeamWin(result: BattleResultPayload, myId: string): boolean {
  const myTeam = result.players.find((p) => p.userId === myId)?.teamIndex;
  if (result.winnerTeamIndex != null && result.winnerTeamIndex !== undefined && myTeam != null) {
    return result.winnerTeamIndex === myTeam;
  }
  return result.winnerId === myId;
}

const MONACO_LANG: Record<string, string> = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
};

export default function BattlePage() {
  const { battleId } = useParams<{ battleId: string }>();
  const navigate = useNavigate();
  const me = useSelector((s: RootState) => s.auth.user);
  const myId = me?.id ? String(me.id) : '';

  const { socket, connected, joinBattle, submitCode } = useBattleSocket(!!battleId);

  const { phase, setPhase, reset, remainingSeconds, totalDurationSeconds, paused, opponentSubmitted, setTimerTick, setOpponentSubmitted } =
    useBattleStore();
  const [startPayload, setStartPayload] = useState<BattleStartPayload | null>(null);
  const [lang, setLang] = useState('python');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [iSubmitted, setISubmitted] = useState(false);
  const [lastRunSummary, setLastRunSummary] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<BattleResultPayload | null>(null);
  const startPayloadRef = useRef<BattleStartPayload | null>(null);
  startPayloadRef.current = startPayload;

  const languages = useMemo(() => startPayload?.challenge.languages ?? ['python'], [startPayload]);
  const isTeamMode = !!startPayload?.mode && startPayload.mode !== '1v1';

  useEffect(() => {
    if (languages.length && !languages.includes(lang)) {
      setLang(languages[0]);
    }
  }, [languages, lang]);

  useEffect(() => {
    reset();
  }, [reset]);

  const playSubmitFeedback = useCallback(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(120);
    }
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.04;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        ctx.close();
      }, 120);
    } catch {
      /* ignore browser audio limitations */
    }
  }, []);

  useEffect(() => {
    if (!battleId || !socket) return;

    const applyStart = (p: BattleStartPayload) => {
      setStartPayload(p);
      setPhase('active');
      setSubmitError(null);
      setISubmitted(false);
      setLastRunSummary(null);
      setOpponentSubmitted(false);
      const langs = p.challenge.languages?.length ? p.challenge.languages : ['python'];
      const primary = langs[0];
      setLang(primary);
      const sc = p.challenge.starterCode?.[primary] ?? '';
      setCode(sc);
      setTimerTick({
        remainingSeconds: p.durationSeconds,
        totalDurationSeconds: p.durationSeconds,
        paused: false,
      });
    };

    const onStart = (p: BattleStartPayload) => {
      if (p.battleId === battleId) applyStart(p);
    };
    const onSync = (p: BattleStartPayload) => {
      if (p.battleId === battleId) applyStart(p);
    };
    const onWaiting = (p: { battleId?: string }) => {
      if (!p?.battleId || p.battleId === battleId) setPhase('waiting');
    };
    const onTick = (p: BattleTimerTickPayload) => {
      if (p.battleId !== battleId) return;
      setTimerTick({
        remainingSeconds: p.remainingSeconds ?? p.remainingTime ?? 0,
        totalDurationSeconds: p.totalDurationSeconds,
        paused: p.paused,
        players: p.players,
      });
      if ((p.remainingSeconds ?? p.remainingTime ?? 0) <= 0) {
        setPhase('waiting');
      }
    };
    const onOpp = (p: { battleId: string; userId: string }) => {
      if (p.battleId === battleId && isRivalSubmission(startPayloadRef.current, myId, p.userId)) {
        setOpponentSubmitted(true);
      }
    };
    const onResult = (p: BattleResultPayload) => {
      if (p.battleId !== battleId) return;
      setPhase('done');
      setResultModal(p);
      setTimeout(() => {
        navigate(`/battle/result/${battleId}`, { state: { result: p } });
      }, 1800);
    };

    socket.on('battle_start', onStart);
    socket.on('battle_sync', onSync);
    socket.on('battle_waiting', onWaiting);
    socket.on('timer_tick', onTick);
    socket.on('opponent_submitted', onOpp);
    socket.on('battle_result', onResult);

    return () => {
      socket.off('battle_start', onStart);
      socket.off('battle_sync', onSync);
      socket.off('battle_waiting', onWaiting);
      socket.off('timer_tick', onTick);
      socket.off('opponent_submitted', onOpp);
      socket.off('battle_result', onResult);
    };
  }, [battleId, socket, navigate, myId, setPhase, setOpponentSubmitted, setTimerTick]);

  const doJoin = useCallback(async () => {
    if (!battleId) return;
    const ack = await joinBattle(battleId);
    if (!ack.ok) {
      setSubmitError(ack.error || 'Could not join battle');
      setPhase('waiting');
    }
  }, [battleId, joinBattle]);

  useEffect(() => {
    if (connected && battleId) void doJoin();
  }, [connected, battleId, doJoin]);

  useEffect(() => {
    if (!battleId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const pollSummary = async () => {
      try {
        const { data } = await battleApi.getSummary(battleId);
        if (cancelled || !data) return;
        const summary = data as BattleResultPayload & { status?: string; durationSeconds?: number };
        if (summary.status === 'finished') {
          setPhase('done');
          setResultModal(summary);
          navigate(`/battle/result/${battleId}`, { state: { result: summary } });
          if (timer) clearInterval(timer);
          timer = null;
          return;
        }
        setPhase('waiting');
      } catch {
        /* ignore polling failures */
      }
    };

    // Fallback join path: if socket is unavailable, still mark ready through HTTP.
    if (!connected) {
      void battleApi.joinBattleHttp(battleId).catch(() => undefined);
      setPhase('waiting');
      timer = setInterval(() => {
        void pollSummary();
      }, 3000);
      void pollSummary();
    }

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [battleId, connected, navigate, setPhase]);

  const handleSubmit = async () => {
    if (!battleId || iSubmitted || submitting || phase !== 'active') return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const out = await submitCode(battleId, code, lang);
      if (!out.ok) {
        setSubmitError(out.error || 'Submit failed');
        return;
      }
      setISubmitted(true);
      playSubmitFeedback();
      setLastRunSummary(
        out.passed
          ? `All tests passed in ${out.executionTimeMs} ms`
          : `Tests ${out.overall.passed}/${out.overall.total} passed (${out.executionTimeMs} ms)`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (remainingSeconds > 0 && remainingSeconds <= 10) {
      playSubmitFeedback();
    }
  }, [remainingSeconds, playSubmitFeedback]);

  if (!battleId) {
    return <p className="p-8 text-center text-gray-600">Invalid battle.</p>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {startPayload?.challenge.title ?? 'Battle'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {phase === 'waiting' &&
              (isTeamMode ? 'Waiting for all players to be ready…' : 'Waiting for both players to be ready…')}
            {phase === 'loading' && 'Connecting…'}
            {phase === 'active' && 'Timer is server-authoritative.'}
            {phase === 'done' && 'Redirecting to results…'}
          </p>
        </div>
        {iSubmitted && (
          <span className="text-sm text-green-700 dark:text-green-400 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
            You submitted
          </span>
        )}
      </div>

      {phase === 'active' && (
        <div className="mb-5">
          <BattleTimer
            remainingSeconds={remainingSeconds}
            totalDurationSeconds={totalDurationSeconds}
            paused={paused}
            opponentSubmitted={opponentSubmitted}
            pendingLabel={isTeamMode ? 'Enemy team pending' : undefined}
            submittedLabel={isTeamMode ? 'Enemy team submitted' : undefined}
          />
        </div>
      )}

      {phase === 'waiting' && (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
        </div>
      )}

      {(phase === 'active' || (phase === 'loading' && startPayload)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 max-w-none text-sm">
            <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300">
              {startPayload?.challenge.description ?? 'Loading challenge…'}
            </pre>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {languages.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setLang(l);
                    const sc = startPayload?.challenge.starterCode?.[l];
                    if (sc) setCode(sc);
                  }}
                  disabled={iSubmitted}
                  className={`rounded-lg px-3 py-1 text-sm font-medium ${
                    lang === l
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  } disabled:opacity-50`}
                >
                  {l}
                </button>
              ))}
            </div>
            <div className="h-[420px] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Editor
                height="100%"
                language={MONACO_LANG[lang] ?? 'plaintext'}
                value={code}
                onChange={(v) => !iSubmitted && setCode(v ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  readOnly: iSubmitted || phase !== 'active' || remainingSeconds <= 0,
                }}
              />
            </div>
            {submitError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {submitError}
              </p>
            )}
            {lastRunSummary && <p className="text-sm text-gray-600 dark:text-gray-400">{lastRunSummary}</p>}
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={submitting || iSubmitted || phase !== 'active' || remainingSeconds <= 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              Submit solution
            </button>
          </div>
        </div>
      )}

      {resultModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center shadow-xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {resultModal.draw ? 'Draw' : didMyTeamWin(resultModal, myId) ? 'You won' : 'You lost'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {resultModal.finishReason ? `Reason: ${resultModal.finishReason}` : 'Battle finished'}
            </p>
            <ul className="text-left text-sm divide-y divide-gray-200 dark:divide-gray-700 rounded-lg border border-gray-200 dark:border-gray-700">
              {resultModal.players.map((p) => (
                <li key={p.userId} className="px-3 py-2 flex items-center justify-between gap-3">
                  <span className="text-gray-800 dark:text-gray-200">
                    {p.username}
                    {p.userId === myId ? ' (you)' : ''}
                  </span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {(p.scoreBreakdown?.totalScore ?? 0).toFixed(2)} pts
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">Redirecting to detailed result…</p>
          </div>
        </div>
      )}
    </div>
  );
}
