import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, Button } from '../../shared/components';
import { notificationsApi, type NotificationItem } from '../../services/api';

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

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.list({ page: 1, limit: 15 });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(typeof data?.unreadCount === 'number' ? data.unreadCount : 0);
    } catch {
      setItems([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const safeItems = Array.isArray(items) ? items : [];

  useEffect(() => {
    load();
    const t = window.setInterval(load, 60000);
    return () => window.clearInterval(t);
  }, [load]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const hrefFor = (n: NotificationItem) => {
    if (n.meta?.href) return n.meta.href;
    if (n.meta?.challengeId) return `/challenges/${n.meta.challengeId}`;
    if (n.meta?.competitionId) return `/competitions/${n.meta.competitionId}`;
    return null;
  };

  const onOpenItem = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        /* ignore */
      }
    }
    const path = hrefFor(n);
    setOpen(false);
    if (path) navigate(path);
  };

  const onMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  };

  const trigger = (
    <button
      type="button"
      className="relative rounded-lg p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" aria-hidden />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} trigger={trigger} align="end" className="max-h-[min(70vh,420px)] w-[min(calc(100vw-2rem),20rem)] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-gray-600">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</span>
        {unreadCount > 0 && (
          <Button type="button" variant="ghost" className="!h-auto !py-1 !px-2 text-xs" onClick={() => void onMarkAll()}>
            Mark all read
          </Button>
        )}
      </div>
      <div className="max-h-[min(60vh,340px)] overflow-y-auto py-1">
        {loading && safeItems.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">Loading...</p>
        ) : safeItems.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">No notifications</p>
        ) : (
          safeItems.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => void onOpenItem(n)}
              className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700/80 ${
                n.read ? 'opacity-80' : 'bg-blue-50/80 dark:bg-blue-950/30'
              }`}
            >
              <span className="font-medium text-gray-900 dark:text-white">{n.title}</span>
              <span className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">{n.body}</span>
              <span className="text-[10px] text-gray-400">{formatRelative(n.createdAt)}</span>
            </button>
          ))
        )}
      </div>
      <DropdownMenuSeparator />
      <DropdownMenuItem to="/notifications">View all notifications</DropdownMenuItem>
    </DropdownMenu>
  );
}
