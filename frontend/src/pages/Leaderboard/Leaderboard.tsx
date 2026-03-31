import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card, Button } from '../../shared/components';
import { gamificationApi } from '../../services/api';
import { useGamificationStore } from '../../stores/gamificationStore';
import { motion } from 'framer-motion';
import { Search, Crown, Medal, Flame, ChevronLeft, ChevronRight, TrendingUp, Users, Filter, Zap, Target, Trophy } from 'lucide-react';
import { cn } from '../../lib/utils';

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

type LeaderboardPeriod = 'all-time' | 'monthly' | 'weekly';
type LeaderboardType = 'global' | 'speed' | 'code_golf' | 'algorithmic';

const RANK_TIER_COLORS: Record<string, string> = {
  F: 'text-gray-400 bg-gray-500/20',
  E: 'text-gray-300 bg-gray-400/20',
  D: 'text-amber-600 dark:text-amber-400 bg-amber-500/20',
  C: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/20',
  B: 'text-blue-600 dark:text-blue-400 bg-blue-500/20',
  A: 'text-purple-600 dark:text-purple-400 bg-purple-500/20',
  S: 'text-yellow-500 bg-yellow-500/20',
};

const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  'all-time': 'All Time',
  monthly: 'This Month',
  weekly: 'This Week',
};

const TYPE_LABELS: Record<LeaderboardType, string> = {
  global: 'Global',
  speed: 'Speed',
  code_golf: 'Code Golf',
  algorithmic: 'Algorithmic',
};

const TYPE_ICONS: Record<LeaderboardType, React.ReactNode> = {
  global: <Trophy className="h-4 w-4" />,
  speed: <Zap className="h-4 w-4" />,
  code_golf: <Target className="h-4 w-4" />,
  algorithmic: <TrendingUp className="h-4 w-4" />,
};

function Leaderboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { summary, fetchSummary } = useGamificationStore();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [period, setPeriod] = useState<LeaderboardPeriod>('all-time');
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [difficulty, setDifficulty] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const limit = 20;

  useEffect(() => {
    if (user?.id) fetchSummary();
  }, [user?.id, fetchSummary]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await gamificationApi.getLeaderboard({
        page,
        limit,
        // Backend may ignore unsupported params; UI remains forward-compatible.
        ...(period ? ({ period } as any) : {}),
        ...(leaderboardType ? ({ type: leaderboardType } as any) : {}),
        ...(difficulty ? ({ difficulty } as any) : {}),
      } as any);
      setData(res.data as LeaderboardResponse);
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [page, period, leaderboardType, difficulty]);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;
  const filteredItems = searchQuery.trim()
    ? items.filter(
        (u) =>
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : items;
  const startRank = (data?.page ?? 1) * limit - limit + 1;

  const myRank = summary?.myRank ?? 0;
  const totalRanked = summary?.totalRanked ?? 0;
  const isCurrentUser = (u: LeaderboardUser) =>
    user && (u.username === (user as { username?: string }).username);

  const podium = page === 1 && !searchQuery.trim() ? items.slice(0, 3) : [];

  const handleResetFilters = () => {
    setPage(1);
    setPeriod('all-time');
    setLeaderboardType('global');
    setDifficulty('');
    setSearchQuery('');
  };

  return (
    <PageContainer maxWidth="7xl" className="relative py-10 md:py-14">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <div className="relative mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="bb-kicker mb-2">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Global ranking
          </div>
          <h1 className="bb-page-heading flex flex-wrap items-center gap-2">
            <span className="bb-title-gradient text-4xl">Leaderboard</span>
          </h1>
          <p className="bb-body-text mt-2 max-w-xl">
            Ranked by XP. Solve challenges and keep your streak to climb.
          </p>
        </div>

        {user && myRank > 0 && totalRanked > 0 && (
          <div className="bb-card flex items-center gap-3 px-5 py-3 shadow-lg">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600 text-lg font-bold text-white">
              #{myRank}
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">Your rank</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                {myRank} <span className="text-slate-500">/ {totalRanked}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {podium.length >= 3 && (
        <div className="relative mb-10 grid grid-cols-3 gap-2 sm:gap-4 md:gap-6">
          {[
            { u: podium[1], place: 2, h: 'md:mt-8', icon: Medal, ring: 'from-slate-300 to-slate-400' },
            { u: podium[0], place: 1, h: '', icon: Crown, ring: 'from-amber-400 to-yellow-500' },
            { u: podium[2], place: 3, h: 'md:mt-10', icon: Medal, ring: 'from-amber-600 to-orange-700' },
          ].map(({ u, place, h, icon: Icon, ring }, idx) => (
            <motion.div
              key={place}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              className={cn(
                'flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white/95 p-4 text-center shadow-lg shadow-slate-200/40 dark:border-slate-700 dark:bg-slate-900/85 dark:shadow-none',
                place === 1 && 'ring-2 ring-amber-400/40 md:scale-105',
                h,
              )}
            >
              <div
                className={cn(
                  'mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg md:h-20 md:w-20',
                  ring,
                )}
              >
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
                ) : (
                  <Icon className="h-8 w-8 md:h-10 md:w-10" aria-hidden />
                )}
              </div>
              <span className="text-2xl font-black text-slate-300 dark:text-slate-600">#{place}</span>
              <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">
                {u.displayName || u.username}
              </p>
              <p className="text-xs text-slate-500">@{u.username}</p>
              <p className="mt-2 text-lg font-bold text-amber-600 dark:text-amber-400">
                {u.xp?.toLocaleString() ?? 0} <span className="text-sm font-normal text-slate-500">XP</span>
              </p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative mb-4 flex flex-wrap gap-2">
        {(Object.keys(PERIOD_LABELS) as LeaderboardPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => {
              setPeriod(p);
              setPage(1);
            }}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              period === p
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="relative mb-6 flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as LeaderboardType[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setLeaderboardType(t);
              setPage(1);
            }}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              leaderboardType === t
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
            )}
          >
            {TYPE_ICONS[t]}
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className="relative mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            placeholder="Filter this page by name or @username…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 shadow-sm transition-shadow focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/25 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            aria-label="Search leaderboard"
          />
        </div>
        {data && (
          <div className="bb-body-text flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-slate-400" aria-hidden />
            <span>
              {data.total.toLocaleString()} player{data.total !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      <div className="relative mb-6 space-y-3">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3 dark:border-slate-700 dark:bg-slate-800/50">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="expert">Expert</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-end">
              <Button variant="secondary" onClick={handleResetFilters} className="w-full">
                Reset Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      )}

      <Card className="bb-card overflow-hidden p-0 shadow-xl">
        <div className="max-h-[min(70vh,720px)] overflow-auto">
          {loading ? (
            <div className="space-y-0 p-4">
              <div className="mb-3 flex gap-4 border-b border-slate-200 pb-3 dark:border-slate-700">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-3 flex-1 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b border-slate-100 py-4 dark:border-slate-800"
                >
                  <div className="h-9 w-9 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-3 w-24 animate-pulse rounded bg-slate-200/80 dark:bg-slate-700/80" />
                  </div>
                  <div className="hidden h-8 w-16 animate-pulse rounded-lg bg-slate-200 sm:block dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead className="sticky top-0 z-10 backdrop-blur-md">
                <tr className="border-b border-slate-200 bg-slate-50/95 dark:border-slate-700 dark:bg-slate-900/95">
                  <th className="p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Rank
                  </th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    User
                  </th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Tier
                  </th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    XP
                  </th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Solved
                  </th>
                  <th className="p-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Streak
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                          <Users className="h-7 w-7 text-slate-400" aria-hidden />
                        </div>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {items.length === 0 ? 'No players yet' : 'No matches on this page'}
                        </p>
                        <p className="text-sm text-slate-500">
                          {items.length === 0
                            ? 'Solve a challenge to get on the board.'
                            : 'Try another name or clear the search.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((u, i) => {
                    const rank = startRank + i;
                    const isYou = isCurrentUser(u);
                    const tier =
                      RANK_TIER_COLORS[u.rankTier as keyof typeof RANK_TIER_COLORS] ??
                      'bg-gray-500/20 text-gray-300';
                    return (
                      <motion.tr
                        key={u.username + rank}
                        initial={false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          'border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40',
                          isYou && 'bg-primary-50/90 dark:bg-primary-900/20',
                        )}
                      >
                        <td className="p-4">
                          <span
                            className={cn(
                              'inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white',
                              rank === 1 && 'bg-gradient-to-br from-amber-400 to-yellow-600',
                              rank === 2 && 'bg-gradient-to-br from-slate-300 to-slate-500',
                              rank === 3 && 'bg-gradient-to-br from-amber-600 to-orange-800',
                              rank > 3 && 'bg-slate-400 dark:bg-slate-600',
                            )}
                          >
                            {rank}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt=""
                                className="h-10 w-10 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-700"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-sky-500 text-sm font-bold text-white">
                                {(u.displayName || u.username || '?').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-medium text-slate-900 dark:text-white">
                                {u.displayName || u.username || '—'}
                                {isYou && (
                                  <span className="ml-2 rounded-md bg-primary-500/20 px-2 py-0.5 text-xs font-semibold text-primary-800 dark:text-primary-300">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="truncate text-sm text-slate-500">@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', tier)}>
                            {u.rankTier}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-amber-600 dark:text-amber-400">
                          {u.xp?.toLocaleString() ?? 0}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          {u.totalChallengesSolved ?? 0}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <Flame className="h-4 w-4 text-orange-500" aria-hidden />
                            {u.currentStreak ?? 0}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {!loading && data && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/80 px-4 py-4 dark:border-slate-700 dark:bg-slate-800/30">
            <span className="text-sm text-slate-500">
              Page {data.page} of {totalPages} · {data.total} players
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm"
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

export default Leaderboard;