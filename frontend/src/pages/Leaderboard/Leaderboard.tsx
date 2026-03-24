import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card, Spinner } from '../../shared/components';
import { Trophy, TrendingUp, Target, Flame, Zap, Filter } from 'lucide-react';
import { apiClient } from '../../services/api';

type LeaderboardPeriod = 'all-time' | 'monthly' | 'weekly';
type LeaderboardType = 'global' | 'speed' | 'code_golf' | 'algorithmic';

interface LeaderboardEntry {
  rank: number;
  _id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  xp: number;
  rankTier: string;
  totalChallengesSolved: number;
  currentStreak: number;
  badgeIds?: string[];
  completions: number;
  wins: number;
  accuracy: number;
  favoriteLanguage?: string;
  stats?: {
    totalSubmissions: number;
  };
}

interface LeaderboardResponse {
  period: LeaderboardPeriod;
  type: LeaderboardType;
  items: LeaderboardEntry[];
  page: number;
  limit: number;
  total: number;
  generatedAt: Date;
}

interface RankContext {
  yourRank: number;
  totalUsers: number;
  nearbyRanks: Array<{
    rank: number;
    userId: string;
    isYou: boolean;
    xp: number;
  }>;
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

const COMPETITION_TYPE_ICONS: Record<LeaderboardType, React.ReactNode> = {
  global: <Trophy className="w-4 h-4" />,
  speed: <Zap className="w-4 h-4" />,
  code_golf: <Target className="w-4 h-4" />,
  algorithmic: <TrendingUp className="w-4 h-4" />,
};

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  'all-time': '🏆 All Time',
  monthly: '📅 This Month',
  weekly: '⚡ This Week',
};

function Leaderboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [rankContext, setRankContext] = useState<RankContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [difficulty, setDifficulty] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const limit = 50;

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        period,
        type: leaderboardType,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (difficulty) params.append('difficulty', difficulty);

      const response = await apiClient.get(`/leaderboard?${params.toString()}`);
      const result = response.data as LeaderboardResponse;
      setData(result);
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : null;
      const normalized = Array.isArray(msg) ? msg.join(', ') : msg;
      const fallback = err instanceof Error ? err.message : 'Failed to load leaderboard';
      const finalMessage = normalized || fallback;
      setError(finalMessage === 'Network Error' ? 'Backend indisponible ou bloqué par CORS' : finalMessage);
    } finally {
      setLoading(false);
    }
  }, [page, period, leaderboardType, difficulty]);

  const fetchRankContext = useCallback(async () => {
    if (!user?.id) return;
    try {
      const response = await apiClient.get(`/leaderboard/rank/${user.id}?period=${period}`);
      setRankContext(response.data as RankContext);
    } catch {
      // Silently fail
    }
  }, [user?.id, period]);

  useEffect(() => {
    fetchLeaderboard();
    fetchRankContext();
  }, [fetchLeaderboard, fetchRankContext]);

  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500 to-orange-600';
    return 'bg-gray-600 dark:bg-gray-700';
  };

  const getMedalEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
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

  const handleFilterReset = () => {
    setPage(1);
    setDifficulty('');
    setSearchQuery('');
  };

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Trophy className="w-8 h-8 text-yellow-500" />
          Global Leaderboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Compete and climb the rankings</p>
      </div>

      {/* Your Rank Card */}
      {rankContext && rankContext.yourRank > 0 && (
        <Card className="mb-6 p-6 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-500/30 dark:border-indigo-500/50">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Your Rank</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                #{rankContext.yourRank}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {rankContext.totalUsers.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Percentile</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {Math.round((100 * rankContext.yourRank) / rankContext.totalUsers)}%
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Period Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              period === p
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Type Selection */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(Object.entries(COMPETITION_TYPE_ICONS) as Array<[LeaderboardType, React.ReactNode]>).map(
          ([type, icon]) => (
            <button
              key={type}
              onClick={() => {
                setLeaderboardType(type);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                leaderboardType === type
                  ? 'bg-emerald-600 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {icon}
              {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
            </button>
          )
        )}
      </div>

      {/* Filters & Search */}
      <div className="mb-6 space-y-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search User
              </label>
              <input
                type="text"
                placeholder="Username or display name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleFilterReset}
                className="w-full px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500 transition-all"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Leaderboard Table */}
      <Card className="overflow-hidden p-0 border-0 shadow-lg">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {items.length === 0 ? 'No users yet. Be the first!' : 'No matching users.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 w-16">Rank</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">User</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-center">Tier</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">XP</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Solved</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Wins</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Accuracy</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-right">Streak</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((entry) => {
                  const isYou = user && entry._id === user.id;
                  return (
                    <tr
                      key={entry._id}
                      className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        isYou ? 'bg-indigo-500/10 dark:bg-indigo-500/20' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex w-8 h-8 items-center justify-center rounded-full text-white text-sm font-bold ${getRankColor(entry.rank)}`}
                          >
                            {entry.rank}
                          </span>
                          {getMedalEmoji(entry.rank) && (
                            <span className="text-lg">{getMedalEmoji(entry.rank)}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {entry.avatarUrl ? (
                            <img
                              src={entry.avatarUrl}
                              alt={entry.displayName || entry.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                              {(entry.displayName || entry.username || '?').slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                              {entry.displayName || entry.username}
                              {isYou && (
                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/30 text-indigo-700 dark:text-indigo-300">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">@{entry.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-3 py-1 rounded text-xs font-semibold ${
                            RANK_TIER_COLORS[entry.rankTier as keyof typeof RANK_TIER_COLORS] ??
                            'bg-gray-500/20 text-gray-300'
                          }`}
                        >
                          {entry.rankTier}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          {entry.xp.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-right text-gray-600 dark:text-gray-400">
                        {entry.totalChallengesSolved}
                      </td>
                      <td className="p-4 text-right text-gray-600 dark:text-gray-400">
                        {entry.wins}
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {entry.accuracy.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="flex items-center justify-end gap-1">
                          {entry.currentStreak > 0 && <Flame className="w-4 h-4 text-orange-500" />}
                          {entry.currentStreak}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </PageContainer>
  );
}

export default Leaderboard;
