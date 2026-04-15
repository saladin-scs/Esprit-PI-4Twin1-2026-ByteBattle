import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import { Button, Card, PageContainer, Spinner } from '../../shared/components';
import { notificationsApi, type NotificationItem } from '../../services/api';

const PAGE_SIZE = 20;

function formatRelative(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} h ago`;

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function hrefFor(n: NotificationItem): string | null {
  if (n.meta?.href) return n.meta.href;
  if (n.meta?.challengeId) return `/challenges/${n.meta.challengeId}`;
  if (n.meta?.competitionId) return `/competitions/${n.meta.competitionId}`;
  return null;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list({ page: targetPage, limit: PAGE_SIZE });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setPage(typeof data?.page === 'number' ? data.page : targetPage);
      setTotalPages(typeof data?.totalPages === 'number' ? Math.max(1, data.totalPages) : 1);
      setTotal(typeof data?.total === 'number' ? data.total : 0);
      setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setItems([]);
      setTotal(0);
      setUnreadCount(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const onOpenNotification = async (notification: NotificationItem) => {
    if (!notification.read) {
      try {
        await notificationsApi.markRead(notification.id);
        setItems((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore single-item mark read failures
      }
    }

    const path = hrefFor(notification);
    if (path) navigate(path);
  };

  const onMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setMarkingAll(false);
    }
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const summaryText = useMemo(() => {
    if (total === 0) return 'No notifications yet';
    return `${total} notification${total > 1 ? 's' : ''} · ${unreadCount} unread`;
  }, [total, unreadCount]);

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{summaryText}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="inline-flex items-center gap-2"
            onClick={() => void load(page)}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            type="button"
            className="inline-flex items-center gap-2"
            onClick={() => void onMarkAllRead()}
            disabled={markingAll || unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        {loading && items.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
            <Bell className="h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No notifications</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Activity alerts and results will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => void onOpenNotification(n)}
                className={`flex w-full items-start justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/80 ${
                  n.read ? '' : 'bg-blue-50/70 dark:bg-blue-950/30'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{n.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{n.body}</p>
                </div>
                <div className="shrink-0 text-right">
                  {!n.read && <span className="mb-1 inline-block rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">NEW</span>}
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatRelative(n.createdAt)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-500 dark:text-gray-400">Page {page} / {totalPages}</p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" disabled={!canPrev || loading} onClick={() => void load(page - 1)}>
            Prev
          </Button>
          <Button type="button" variant="ghost" disabled={!canNext || loading} onClick={() => void load(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
