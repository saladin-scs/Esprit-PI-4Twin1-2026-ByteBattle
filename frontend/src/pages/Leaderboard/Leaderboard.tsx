import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card, Spinner } from '../../shared/components';
import { gamificationApi } from '../../services/api';
import { useGamificationStore } from '../../stores/gamificationStore';

interface LeaderboardUser {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  xp: number;
  rankTier: string;
  totalChallengesSolved: number;
  currentStreak: number;
  badgeIds?: string[];
}

interface LeaderboardResponse {
  items: LeaderboardUser[];
  page: number;
  limit: number;
  total: number;
}

const RANK_TIER_COLORS: Record<string, string> = {
  F: 'text-gray-400 bg-gray-500/20',
  E: 'text-gray-300 bg-gray-400/20',
  D: 'text-amber-600 dark:text-amber-400 bg-amber-500/20',
  C: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/20',
  B: 'text-blue-600 dark:text-blue-400 bg-blue-500/20',
  A: 'text-purple-600 dark:text-purple-400 bg-purple-500/20',
  S: 'text-yellow-500 bg-yellow-500/20',
};

function Leaderboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { summary, fetchSummary } = useGamificationStore();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const limit = 20;

  useEffect(() => {
    if (user?.id) fetchSummary();
  }, [user?.id, fetchSummary]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gamificationApi.getLeaderboard({ page, limit });
      setData(res.data as LeaderboardResponse);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500 to-orange-600';
    return 'bg-gray-600 dark:bg-gray-700';
  };

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const filteredItems = searchQuery.trim()
    ? items.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;
  const startRank = (data?.page ?? 1) * limit - limit + 1;

  const myRank = summary?.myRank ?? 0;
  const totalRanked = summary?.totalRanked ?? 0;
  const isCurrentUser = (u: LeaderboardUser) => user && (u.username === user.username || u.username === (user as { username?: string }).username);

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Leaderboard</h1>

      {user && myRank > 0 && totalRanked > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 border border-indigo-500/30">
          <span className="font-semibold text-indigo-700 dark:text-indigo-300">Your position: </span>
          <span className="text-indigo-600 dark:text-indigo-400">#{myRank} of {totalRanked}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Ranked by XP. Solve challenges and stay active to climb!
        </p>
        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Search user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="overflow-hidden p-0 border-0 shadow-lg">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Rank</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">User</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Tier</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">XP</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Solved</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Streak</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      {items.length === 0 ? 'No users yet. Be the first!' : 'No matching users.'}
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((u, i) => {
                    const rank = startRank + i;
                    const isYou = isCurrentUser(u);
                    return (
                      <tr
                        key={u.username + rank}
                        className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${isYou ? 'bg-indigo-500/10 dark:bg-indigo-500/20' : ''}`}
                      >
                        <td className="p-4">
                          <span
                            className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-white text-sm font-bold ${getRankColor(rank)}`}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                              {(u.displayName || u.username || '?').slice(0, 2)}
                            </div>
                          )}
                          <span>{u.displayName || u.username || '—'}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">@{u.username}</span>
                          {isYou && <span className="ml-1 px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/30 text-indigo-700 dark:text-indigo-300">You</span>}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              RANK_TIER_COLORS[u.rankTier as keyof typeof RANK_TIER_COLORS] ?? 'bg-gray-500/20 text-gray-300'
                            }`}
                          >
                            {u.rankTier}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-amber-600 dark:text-amber-400">
                          {u.xp?.toLocaleString() ?? 0}
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {u.totalChallengesSolved ?? 0}
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {u.currentStreak ?? 0} 🔥
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && data && totalPages > 1 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 flex-wrap gap-4">
            <span className="text-sm text-gray-500">
              Page {data.page} of {totalPages} · {data.total} total
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

export default Leaderboard;
