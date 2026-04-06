import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, Loader2, WifiOff } from 'lucide-react';
import { battleApi } from '../../services/api';
import { useBattleSocket, type BattleFoundPayload } from '../../hooks/useBattleSocket';

export default function MatchmakingPage() {
  const navigate = useNavigate();
  const { socket, connected, error, joinQueue, leaveQueue } = useBattleSocket(true);
  const [queued, setQueued] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToBattle = useCallback(
    (battleId: string) => {
      setQueued(false);
      navigate(`/battle/room/${battleId}`);
    },
    [navigate],
  );

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

  const handleFindMatch = async () => {
    setBusy(true);
    setStatus(null);
    try {
      if (connected) {
        const ack = await joinQueue();
        if (!ack.ok) {
          setStatus(ack.error || 'Could not join queue');
          setQueued(false);
        } else if (ack.battleId) {
          goToBattle(ack.battleId);
        } else {
          setQueued(true);
        }
        return;
      }
      const http = await battleApi.joinQueueHttp();
      if (http.data.battleId) {
        goToBattle(http.data.battleId);
        return;
      }
      setQueued(!!http.data.queued);
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
      setStatus(e instanceof Error ? e.message : 'Matchmaking failed');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    leaveQueue();
    setQueued(false);
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

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 mb-6">
        <Swords className="h-8 w-8" aria-hidden />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">1v1 coding battle</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        You will be paired with another developer, receive the same challenge, and compete on correctness and speed.
        The server controls the timer and grading.
      </p>

      {!connected && (
        <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 text-sm mb-4">
          <WifiOff className="h-4 w-4 shrink-0" />
          Connecting to battle server…
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
          {error}
        </p>
      )}

      {status && <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{status}</p>}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {!queued ? (
          <button
            type="button"
            onClick={() => void handleFindMatch()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            Find opponent
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 px-6 py-3 font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Leave queue
          </button>
        )}
      </div>

      {queued && (
        <p className="mt-8 text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for another player…
        </p>
      )}
    </div>
  );
}
