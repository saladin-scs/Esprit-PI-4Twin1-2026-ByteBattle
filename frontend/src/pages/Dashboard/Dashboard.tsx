import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { RootState } from '../../store/store';
import { PageContainer, Card, Button, Spinner, SimpleTooltip, ProgressBar } from '../../shared/components';
import { gamificationApi } from '../../services/api';
import { useGamificationStore } from '../../stores/gamificationStore';
import { LayoutDashboard, Flame, Target, Trophy, Sparkles, Info } from 'lucide-react';
import { ChatAvailabilityCallout } from '../../shared/components/ChatAvailabilityCallout';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer, Cell } from 'recharts';

const RANK_TIER_COLORS: Record<string, string> = {
  F: 'bg-slate-500/20 text-slate-600 dark:text-slate-300',
  E: 'bg-slate-400/20 text-slate-700 dark:text-slate-200',
  D: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  C: 'bg-primary-500/20 text-primary-800 dark:text-primary-300',
  B: 'bg-sky-500/20 text-sky-800 dark:text-sky-300',
  A: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  S: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
};

const DIFF_COLORS = ['#22c55e', '#eab308', '#f97316', '#ef4444'];

function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { summary, loading, error: storeError, fetchSummary, setError } = useGamificationStore();
  const [claimingDaily, setClaimingDaily] = useState(false);
  const error = storeError ?? '';

  useEffect(() => {
    if (!user?.id) return;
    fetchSummary();
  }, [user?.id, fetchSummary]);

  useEffect(() => {
    if (!user?.id) return;
    const onFocus = () => fetchSummary();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.id, fetchSummary]);

  const handleDailyLogin = async () => {
    setClaimingDaily(true);
    setError(null);
    try {
      await gamificationApi.dailyLogin();
      await fetchSummary();
    } catch {
      setError('Could not claim daily reward.');
    } finally {
      setClaimingDaily(false);
    }
  };

  const diff = summary?.problemsByDifficulty;
  const chartData =
    diff != null
      ? [
          { name: 'Easy', v: diff.easy },
          { name: 'Medium', v: diff.medium },
          { name: 'Hard', v: diff.hard },
          { name: 'Expert', v: diff.expert },
        ]
      : [];

  const tierPct = summary?.rankProgress?.progressFraction != null
    ? Math.round(summary.rankProgress.progressFraction * 100)
    : 0;

  if (loading && !summary) {
    return (
      <PageContainer maxWidth="7xl" className="relative py-12">
        <div className="bb-hero-gradient-tall" aria-hidden />
        <div className="relative flex min-h-[240px] flex-col items-center justify-center gap-4">
          <Spinner size="lg" />
          <p className="bb-body-text text-sm">Loading your stats…</p>
        </div>
      </PageContainer>
    );
  }

  const cardMotion = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <PageContainer maxWidth="7xl" className="relative py-10 md:py-14">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <header className="relative mb-10">
        <div className="bb-kicker">
          <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
          Dashboard
        </div>
        <h1 className="bb-page-heading mb-2 flex flex-wrap items-center gap-2">
          <Sparkles className="h-8 w-8 text-amber-500" aria-hidden />
          Welcome back,{' '}
          <span className="bb-title-gradient text-3xl md:text-4xl">{user?.username}</span>
        </h1>
        <p className="bb-body-text max-w-xl">
          XP, streak, solves by difficulty, and rank — Radix tooltips on hover for extra context.
        </p>
      </header>

      {error && (
        <div className="relative mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {summary && (
        <>
        <div className="relative mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <motion.div {...cardMotion} transition={{ duration: 0.25, delay: 0 }}>
            <Card className="bb-card group h-full p-6 transition-shadow hover:shadow-xl">
              <div className="mb-1 flex items-center justify-between">
                <span className="bb-body-text text-sm font-medium">Total XP</span>
                <SimpleTooltip content="Earned by solving challenges, daily login, and contests.">
                  <button type="button" className="text-slate-400 hover:text-primary-500" aria-label="XP info">
                    <Info className="h-4 w-4" />
                  </button>
                </SimpleTooltip>
              </div>
              <div className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {summary.xp.toLocaleString()}
              </div>
              <div className="mt-2">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${
                    RANK_TIER_COLORS[summary.rankTier] ?? 'bg-slate-500/20 text-slate-600'
                  }`}
                >
                  Tier {summary.rankTier}
                </span>
              </div>
              {summary.rankProgress?.nextTier && (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Next tier</span>
                    <span>{tierPct}%</span>
                  </div>
                  <ProgressBar value={tierPct} className="h-2.5" />
                  <p className="bb-body-text mt-1.5 text-xs">
                    {summary.rankProgress.xpNeededForNext} XP → Tier {summary.rankProgress.nextTier}
                  </p>
                </div>
              )}
            </Card>
          </motion.div>

          <motion.div {...cardMotion} transition={{ duration: 0.25, delay: 0.05 }}>
            <Card className="bb-card h-full p-6 transition-shadow hover:shadow-xl">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15">
                  <Flame className="h-5 w-5 text-orange-500" aria-hidden />
                </div>
                <SimpleTooltip content="Log in daily to extend your streak. Freezes protect you if you miss a day.">
                  <span className="bb-body-text cursor-help text-sm font-medium border-b border-dotted border-slate-400">
                    Streak
                  </span>
                </SimpleTooltip>
              </div>
              <div className="text-3xl font-bold tabular-nums text-orange-500 dark:text-orange-400">
                {summary.currentStreak}
                <span className="text-lg font-semibold text-slate-500 dark:text-slate-400"> days</span>
              </div>
              <p className="bb-body-text mt-2 text-sm">
                Best {summary.longestStreak} · {summary.streakFreezes} freeze{summary.streakFreezes !== 1 ? 's' : ''}
              </p>
            </Card>
          </motion.div>

          <motion.div {...cardMotion} transition={{ duration: 0.25, delay: 0.1 }}>
            <Card className="bb-card h-full p-6 transition-shadow hover:shadow-xl">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15">
                  <Target className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <span className="bb-body-text text-sm font-medium">Challenges solved</span>
              </div>
              <div className="text-3xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
                {summary.totalChallengesSolved}
              </div>
              <p className="bb-body-text mt-2 text-xs leading-relaxed">
                E {diff?.easy ?? 0} · M {diff?.medium ?? 0} · H {diff?.hard ?? 0} · Ex {diff?.expert ?? 0}
              </p>
            </Card>
          </motion.div>

          <motion.div {...cardMotion} transition={{ duration: 0.25, delay: 0.15 }}>
            <Card className="bb-card h-full p-6 transition-shadow hover:shadow-xl">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15">
                  <Trophy className="h-5 w-5 text-primary-600 dark:text-primary-400" aria-hidden />
                </div>
                <span className="bb-body-text text-sm font-medium">Global rank</span>
              </div>
              {summary.myRank != null && summary.totalRanked > 0 ? (
                <>
                  <div className="text-3xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
                    #{summary.myRank}
                  </div>
                  <p className="bb-body-text mt-1 text-sm">of {summary.totalRanked.toLocaleString()} players</p>
                </>
              ) : (
                <p className="bb-body-text text-sm">Solve a challenge to appear on the leaderboard.</p>
              )}
            </Card>
          </motion.div>
        </div>
        <motion.div
          {...cardMotion}
          transition={{ duration: 0.25, delay: 0.18 }}
          className="relative -mt-4 mb-8"
        >
          <ChatAvailabilityCallout variant="compact" />
        </motion.div>
        </>
      )}

      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative mb-8"
        >
          <Card className="bb-card overflow-hidden p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="bb-section-title text-base">Solves by difficulty</h2>
              <SimpleTooltip content="Count of challenges you’ve fully solved, broken down by difficulty.">
                <Info className="h-4 w-4 cursor-help text-slate-400" aria-hidden />
              </SimpleTooltip>
            </div>
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} className="text-slate-500" />
                  <YAxis type="category" dataKey="name" width={52} tick={{ fontSize: 12 }} />
                  <ChartTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid rgb(226 232 240)',
                      fontSize: 12,
                    }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Bar dataKey="v" radius={[0, 8, 8, 0]} barSize={26}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={DIFF_COLORS[i % DIFF_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>
      )}

      {summary && (
        <div className="relative mb-8 flex flex-wrap gap-3">
          {summary.canClaimDailyLogin && (
            <Button onClick={handleDailyLogin} disabled={claimingDaily} className="inline-flex items-center gap-2 shadow-lg shadow-primary-500/20">
              {claimingDaily ? <Spinner size="sm" /> : '🎁'} Claim daily (+10 XP)
            </Button>
          )}
          <Link to="/challenges">
            <Button variant="secondary">Challenges</Button>
          </Link>
          <Link to="/competitions">
            <Button variant="secondary">Contests</Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="secondary">Leaderboard</Button>
          </Link>
        </div>
      )}

      {summary && (summary.badgeIds?.length > 0 || summary.lastUnlockedBadge) && (
        <Card className="bb-card p-6">
          <h2 className="bb-section-title mb-4">Badges</h2>
          {summary.lastUnlockedBadge && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 dark:from-amber-500/15 dark:to-orange-500/10"
            >
              <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                🏅 Latest · {summary.lastUnlockedBadge.name}
              </span>
            </motion.div>
          )}
          <div className="flex flex-wrap gap-2">
            {(summary.badgeIds ?? []).map((id) => (
              <SimpleTooltip key={id} content={id.replace(/_/g, ' ')}>
                <span className="cursor-default rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                  {id.replace(/_/g, ' ')}
                </span>
              </SimpleTooltip>
            ))}
          </div>
        </Card>
      )}

      {summary && !summary.badgeIds?.length && !summary.lastUnlockedBadge && (
        <Card className="bb-card p-6">
          <h2 className="bb-section-title mb-2">Badges</h2>
          <p className="bb-body-text text-sm">
            Unlock badges by solving challenges and maintaining streaks.{' '}
            <Link to="/leaderboard" className="font-semibold text-primary-600 hover:underline dark:text-primary-400">
              View leaderboard →
            </Link>
          </p>
        </Card>
      )}
    </PageContainer>
  );
}

export default Dashboard;
