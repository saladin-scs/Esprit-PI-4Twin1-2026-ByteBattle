import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../services/api';
import { PageContainer, Card, Spinner } from '../../shared/components';

interface GamificationStatsResponse {
  totalUsers: number;
  usersWithBadges: number;
  averageXp: number;
  maxXp: number;
  topBadges: Array<{ badgeId: string; count: number }>;
}

function AdminGamificationStats() {
  const [data, setData] = useState<GamificationStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await adminApi.getGamificationStats();
        setData(res.data as GamificationStatsResponse);
      } catch {
        setError('Failed to load gamification stats.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Gamification Stats</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Platform-wide XP and badge statistics.
          </p>
        </div>
        <Link
          to="/admin/users"
          className="text-indigo-500 dark:text-indigo-400 hover:underline text-sm font-medium"
        >
          ← Back to User Management
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total users</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalUsers}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Users with badges</div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.usersWithBadges}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Average XP</div>
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{data.averageXp}</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Max XP</div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.maxXp}</div>
          </Card>
        </div>
      ) : null}

      {data?.topBadges && data.topBadges.length > 0 && (
        <Card className="p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top badges</h2>
          <ul className="space-y-2">
            {data.topBadges.map((b) => (
              <li
                key={b.badgeId}
                className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0"
              >
                <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{b.badgeId}</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">{b.count} users</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageContainer>
  );
}

export default AdminGamificationStats;
