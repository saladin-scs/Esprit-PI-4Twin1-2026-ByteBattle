import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Trophy, Equal, ArrowLeft } from 'lucide-react';
import { battleApi } from '../../services/api';
import type { BattleResultPayload } from '../../hooks/useBattleSocket';
import { RootState } from '../../store/store';

function userWonBattle(result: BattleResultPayload, myId: string): boolean {
  if (result.draw || !myId) return false;
  const myTeam = result.players.find((p) => p.userId === myId)?.teamIndex;
  if (result.winnerTeamIndex != null && result.winnerTeamIndex !== undefined && myTeam != null) {
    return result.winnerTeamIndex === myTeam;
  }
  return result.winnerId === myId;
}

export default function BattleResultPage() {
  const { battleId } = useParams<{ battleId: string }>();
  const location = useLocation();
  const me = useSelector((s: RootState) => s.auth.user);
  const myId = me?.id ? String(me.id) : '';

  const [result, setResult] = useState<BattleResultPayload | null>(
    (location.state as { result?: BattleResultPayload } | null)?.result ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!battleId || result) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await battleApi.getSummary(battleId);
        if (cancelled) return;
        setResult(data as BattleResultPayload);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load result');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [battleId, result]);

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link to="/battle/matchmaking" className="mt-4 inline-block text-indigo-600 dark:text-indigo-400">
          Back to matchmaking
        </Link>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-gray-600 dark:text-gray-400">
        Loading results…
      </div>
    );
  }

  const won = userWonBattle(result, myId);
  const isDraw = !!result.draw;
  const teamMode = !!result.mode && result.mode !== '1v1';
  const fmtDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()} (${d.getMilliseconds()}ms)`;
  };
  const byUserId = new Map(result.players.map((p) => [p.userId, p]));
  const sortedPlayers = [...result.players].sort(
    (a, b) => (b.scoreBreakdown?.totalScore ?? 0) - (a.scoreBreakdown?.totalScore ?? 0),
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center">
      <Link
        to="/battle/matchmaking"
        className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        New battle
      </Link>

      <div className="mb-6 flex justify-center">
        {isDraw ? (
          <Equal className="h-16 w-16 text-gray-400" />
        ) : (
          <Trophy className={`h-16 w-16 ${won ? 'text-amber-500' : 'text-gray-400'}`} />
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {isDraw ? 'Draw' : won ? 'You won' : 'You lost'}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        {result.finishReason ? `Reason: ${result.finishReason}` : 'Battle finished'}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
        Start: {fmtDateTime(result.startedAt)} · End: {fmtDateTime(result.finishedAt ?? result.endsAt)}
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
            <tr>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted at</th>
              <th className="px-3 py-2 text-right">Total score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedPlayers.map((p) => (
              <tr key={p.userId}>
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white">
                  {p.username}
                  {p.userId === myId ? ' (you)' : ''}
                </td>
                {teamMode && (
                  <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                    {p.teamIndex === 0 ? 'A' : p.teamIndex === 1 ? 'B' : '—'}
                  </td>
                )}
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">
                  {p.submitted ? (p.passed ? 'Passed all tests' : 'Submitted') : 'No submission'}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{fmtDateTime(p.submissionTime)}</td>
                <td className="px-3 py-2 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                  {(p.scoreBreakdown?.totalScore ?? 0).toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.scoreWeights && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Weights: pass {result.scoreWeights.passedAllTests}% · speed {result.scoreWeights.submissionSpeed}% · exec{' '}
          {result.scoreWeights.executionEfficiency}% · bonus {result.scoreWeights.bonus}%
        </p>
      )}

      {result.submissions?.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Execution summary</h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">Language</th>
                  <th className="px-3 py-2 text-left">Tests</th>
                  <th className="px-3 py-2 text-left">Execution</th>
                  <th className="px-3 py-2 text-left">Submitted at</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-600 dark:text-gray-300">
                {result.submissions.map((s) => (
                  <tr key={`${s.userId}-${s.submittedAt}`}>
                    <td className="px-3 py-2">{s.username || byUserId.get(s.userId)?.username || 'User'}</td>
                    <td className="px-3 py-2">{s.language}</td>
                    <td className="px-3 py-2">{s.overall ? `${s.overall.passed}/${s.overall.total}` : '—'}</td>
                    <td className="px-3 py-2">{s.executionTimeMs} ms</td>
                    <td className="px-3 py-2">{fmtDateTime(s.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 text-left">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Score breakdown</h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-3 py-2 text-left">Player</th>
                <th className="px-3 py-2 text-left">Pass</th>
                <th className="px-3 py-2 text-left">Speed</th>
                <th className="px-3 py-2 text-left">Exec</th>
                <th className="px-3 py-2 text-left">Bonus</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-600 dark:text-gray-300">
              {sortedPlayers.map((p) => {
                const sb = p.scoreBreakdown;
                return (
                  <tr key={`${p.userId}-score`}>
                    <td className="px-3 py-2">{p.username}</td>
                    <td className="px-3 py-2">{(sb?.passScore ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2">{(sb?.submissionSpeedScore ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2">{(sb?.executionEfficiencyScore ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2">{(sb?.bonusScore ?? 0).toFixed(3)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{(sb?.totalScore ?? 0).toFixed(3)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
