import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card, Button, Spinner } from '../../shared/components';
import { gamificationApi } from '../../services/api';
import { useGamificationStore } from '../../stores/gamificationStore';

const RANK_TIER_COLORS: Record<string, string> = {
  F: 'bg-gray-500/20 text-gray-300',
  E: 'bg-gray-400/20 text-gray-200',
  D: 'bg-amber-500/20 text-amber-400',
  C: 'bg-emerald-500/20 text-emerald-400',
  B: 'bg-blue-500/20 text-blue-400',
  A: 'bg-purple-500/20 text-purple-400',
  S: 'bg-yellow-500/20 text-yellow-400',
};

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

  if (loading && !summary) {
    return (
      <PageContainer maxWidth="7xl" className="py-12">
        <div className="flex justify-center items-center min-h-[200px]">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Welcome, {user?.username}!
      </h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">
        Track your progress and keep your streak alive.
      </p>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {summary && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total XP</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary.xp.toLocaleString()}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                  RANK_TIER_COLORS[summary.rankTier] ?? 'bg-gray-500/20 text-gray-300'
                }`}
              >
                Tier {summary.rankTier}
              </span>
            </div>
            {summary.rankProgress?.nextTier && (
              <div className="mt-3">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
                  <div
                    className="h-full rounded-full bg-amber-500 dark:bg-amber-400 transition-all duration-500"
                    style={{ width: `${(summary.rankProgress.progressFraction * 100).toFixed(1)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {summary.rankProgress.xpNeededForNext} XP to Tier {summary.rankProgress.nextTier}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Streak</div>
            <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
              {summary.currentStreak} day{summary.currentStreak !== 1 ? 's' : ''} 🔥
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Longest: {summary.longestStreak} · Freezes: {summary.streakFreezes}
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Challenges</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {summary.totalChallengesSolved} solved
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              E: {summary.problemsByDifficulty?.easy ?? 0} · M: {summary.problemsByDifficulty?.medium ?? 0} · H: {summary.problemsByDifficulty?.hard ?? 0} · Ex: {summary.problemsByDifficulty?.expert ?? 0}
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Leaderboard</div>
            {summary.myRank != null && summary.totalRanked > 0 ? (
              <>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  #{summary.myRank} of {summary.totalRanked}
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Ranked by XP
                </p>
              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">Solve challenges to get ranked.</p>
            )}
          </Card>
        </div>
      )}

      {summary && (
        <div className="flex flex-wrap gap-4 mb-8">
          {summary.canClaimDailyLogin && (
            <Button
              onClick={handleDailyLogin}
              disabled={claimingDaily}
              className="inline-flex items-center gap-2"
            >
              {claimingDaily ? <Spinner size="sm" /> : '🎁'} Claim daily login (+10 XP)
            </Button>
          )}
          <Link to="/challenges">
            <Button variant="secondary">Solve challenges</Button>
          </Link>
          <Link to="/leaderboard">
            <Button variant="secondary">View leaderboard</Button>
          </Link>
        </div>
      )}

      {summary && (summary.badgeIds?.length > 0 || summary.lastUnlockedBadge) && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Badges</h2>
          {summary.lastUnlockedBadge && (
            <div className="mb-4 p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30">
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
                Latest: 🏅 {summary.lastUnlockedBadge.name}
              </span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {(summary.badgeIds ?? []).map((id) => (
              <span
                key={id}
                className="px-3 py-1 rounded-full text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                title={id}
              >
                {id.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </Card>
      )}

      {summary && (!summary.badgeIds?.length && !summary.lastUnlockedBadge) && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Badges</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Solve challenges, keep your streak, and hit milestones to unlock badges. Check the{' '}
            <Link to="/leaderboard" className="text-indigo-500 dark:text-indigo-400 hover:underline">
              leaderboard
            </Link>{' '}
            to see how you rank.
          </p>
        </Card>
      )}
    </PageContainer>
  );
}

export default Dashboard;
