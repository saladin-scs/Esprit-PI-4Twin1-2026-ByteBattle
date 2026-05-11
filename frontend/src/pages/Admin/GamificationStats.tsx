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

function formatAdminApiError(err: unknown, fallback: string): string {
  const res =
    err && typeof err === 'object' && 'response' in err
      ? (err as { response?: { status?: number; data?: { message?: string } } }).response
      : undefined;
  if (res?.status === 403) {
    return (
      res.data?.message ||
      'Access denied (admin required). Make sure your account was promoted: `npm run make-admin -- your@email.com` in backend/, then refresh.'
    );
  }
  return res?.data?.message || (err instanceof Error ? err.message : fallback);
}

interface ChatReportRow {
  id: string;
  room: string;
  bodySnapshot?: string;
  reason?: string;
  status?: string;
  reporterUserId?: string;
  reportedUserId?: string;
  createdAt?: string;
}

function AdminGamificationStats() {
  const [data, setData] = useState<GamificationStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<ChatReportRow[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState('');

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

  useEffect(() => {
    const loadReports = async () => {
      setReportsLoading(true);
      setReportsError('');
      try {
        const res = await adminApi.getChatReports({ limit: 50, status: 'open' });
        setReportsTotal(res.data?.total ?? 0);
        setReports((res.data?.items as unknown as ChatReportRow[]) ?? []);
      } catch (e) {
        setReportsError(formatAdminApiError(e, 'Could not load chat reports.'));
      } finally {
        setReportsLoading(false);
      }
    };
    loadReports();
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
        <div className="flex flex-wrap gap-4 text-sm font-medium">
          <Link to="/admin/users" className="text-indigo-500 dark:text-indigo-400 hover:underline">
            ← Users
          </Link>
          <Link to="/admin/reclamations" className="text-indigo-500 dark:text-indigo-400 hover:underline">
            Reports
          </Link>
        </div>
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

      <Card className="p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Chat reports (open)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          User reports - API <code className="text-xs">GET /admin/chat-reports</code>
        </p>
        {reportsError && (
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">{reportsError}</p>
        )}
        {reportsLoading ? (
          <Spinner size="sm" />
        ) : reports.length === 0 ? (
          <p className="text-sm text-gray-600 dark:text-gray-300">No open reports.</p>
        ) : (
          <div className="overflow-x-auto">
            <p className="text-xs text-gray-500 mb-2">Total open (all pages): {reportsTotal}</p>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-600 text-gray-500">
                  <th className="py-2 pr-2">Room</th>
                  <th className="py-2 pr-2">Excerpt</th>
                  <th className="py-2 pr-2">Reason</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 dark:border-gray-700/80">
                    <td className="py-2 pr-2 font-mono text-xs">{r.room}</td>
                    <td className="py-2 pr-2 max-w-[200px] truncate" title={r.bodySnapshot}>
                      {r.bodySnapshot}
                    </td>
                    <td className="py-2 pr-2 text-xs">{r.reason || '—'}</td>
                    <td className="py-2 text-xs text-gray-500">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
