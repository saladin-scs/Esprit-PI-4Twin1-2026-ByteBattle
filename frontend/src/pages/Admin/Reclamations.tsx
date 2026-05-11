/**
 * Admin management for user reports.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminReclamationRow, type AdminReclamationSummary } from '../../core/api';
import { Button, Input, Card, Alert, PageContainer, Spinner } from '../../shared/components';
import {
  RECLAMATION_CATEGORIES_SELECT,
  RECLAMATION_CATEGORY_LABELS,
  RECLAMATION_STATUS_LABELS,
} from '../../modules/reclamation/constants';
import type { ReclamationCategory, ReclamationStatus } from '../../services/api';
import { ReclamationStatusBadge } from '../../modules/reclamation/components/ReclamationStatusBadge';

const PAGE_SIZE = 15;

function formatDateEn(iso: string) {
  try {
    return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: RECLAMATION_STATUS_LABELS.open },
  { value: 'read', label: RECLAMATION_STATUS_LABELS.read },
  { value: 'resolved', label: RECLAMATION_STATUS_LABELS.resolved },
  { value: 'cancelled', label: RECLAMATION_STATUS_LABELS.cancelled },
];

function AdminReclamations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inputQuery, setInputQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('oldest');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: AdminReclamationRow[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [selected, setSelected] = useState<AdminReclamationRow | null>(null);
  const [summary, setSummary] = useState<AdminReclamationSummary | null>(null);
  const [statusDraft, setStatusDraft] = useState<ReclamationStatus>('open');
  const [saving, setSaving] = useState(false);
  const [rowSavingId, setRowSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [res, summaryRes] = await Promise.all([
        adminApi.listReclamations({
          page,
          limit: PAGE_SIZE,
          q: appliedQuery.trim() || undefined,
          status: statusFilter || undefined,
          category: categoryFilter || undefined,
          sort: sortOrder,
        }),
        adminApi.getReclamationSummary(),
      ]);
      setData({
        items: res.data.items,
        total: res.data.total,
        page: res.data.page,
        totalPages: res.data.totalPages,
      });
      setSummary(summaryRes.data);
      setSelected((prev) => {
        if (!prev) return null;
        const still = res.data.items.find((i) => i.id === prev.id);
        return still ?? null;
      });
    } catch (err: unknown) {
      const res =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { status?: number; data?: { message?: string } } }).response
          : undefined;
      const msg = res?.data?.message;
      if (res?.status === 403) {
        setError(msg || 'Access denied: admin rights required.');
      } else {
        setError(msg || (err instanceof Error ? err.message : 'Unable to load data.'));
      }
      setData(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [page, appliedQuery, statusFilter, categoryFilter, sortOrder]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (selected) {
      setStatusDraft(selected.status);
    }
  }, [selected]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedQuery(inputQuery.trim());
    setPage(1);
  };

  const saveStatus = async () => {
    if (!selected || statusDraft === selected.status) return;
    await updateStatus(selected.id, statusDraft, true);
  };

  const updateStatus = async (id: string, status: ReclamationStatus, keepSelected = false) => {
    setRowSavingId(id);
    setSuccess('');
    setError('');
    try {
      const res = await adminApi.patchReclamationStatus(id, status);
      setSuccess('Status updated.');
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === res.data.reclamation.id ? res.data.reclamation : i)),
        };
      });
      if (selected?.id === id || keepSelected) {
        setSelected(res.data.reclamation);
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Unable to save changes.');
    } finally {
      setRowSavingId(null);
      setSaving(false);
    }
  };

  const applyQueuePreset = () => {
    setInputQuery('');
    setAppliedQuery('');
    setCategoryFilter('');
    setStatusFilter('open');
    setSortOrder('oldest');
    setPage(1);
  };

  const applyAllPreset = () => {
    setInputQuery('');
    setAppliedQuery('');
    setCategoryFilter('');
    setStatusFilter('');
    setSortOrder('newest');
    setPage(1);
  };

  const selectRow = (row: AdminReclamationRow) => {
    setSelected(row);
    setSuccess('');
    setError('');
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl">
            Triage the moderation queue, resolve issues faster, and use quick status actions directly from the list.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to="/admin/users"
            className="text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
          >
            ΓåÉ Users
          </Link>
          <Link
            to="/admin/gamification"
            className="text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
          >
            Gamification ΓåÆ
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button type="button" variant={statusFilter === 'open' && sortOrder === 'oldest' ? 'primary' : 'secondary'} onClick={applyQueuePreset}>
          Queue view
        </Button>
        <Button type="button" variant={!statusFilter && sortOrder === 'newest' ? 'primary' : 'secondary'} onClick={applyAllPreset}>
          All reports
        </Button>
        <Button type="button" variant="secondary" onClick={() => { setStatusFilter('read'); setPage(1); }}>
          Under review
        </Button>
        <Button type="button" variant="secondary" onClick={() => { setStatusFilter('resolved'); setPage(1); }}>
          Resolved
        </Button>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <Input
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Search (subject, message, email, username...)"
          className="flex-1 min-w-[220px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="min-w-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value || 'all'} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="min-w-[200px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All categories</option>
          {RECLAMATION_CATEGORIES_SELECT.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => {
            setSortOrder(e.target.value as 'newest' | 'oldest');
            setPage(1);
          }}
          className="min-w-[180px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 mb-6">
          <Card className="!p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Total</p>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{summary.total}</p>
          </Card>
          <Card className="!p-4">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                setStatusFilter('open');
                setPage(1);
              }}
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Pending</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{summary.byStatus.open}</p>
            </button>
          </Card>
          <Card className="!p-4">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                setStatusFilter('read');
                setPage(1);
              }}
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Under review</p>
              <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.byStatus.read}</p>
            </button>
          </Card>
          <Card className="!p-4">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => {
                setStatusFilter('resolved');
                setPage(1);
              }}
            >
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Resolved</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.byStatus.resolved}</p>
            </button>
          </Card>
          <Card className="!p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Stale &gt;48h</p>
            <p className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{summary.staleUnresolved}</p>
          </Card>
        </div>
      )}

      {success && (
        <Alert variant="success" className="mb-4">
          {success}
        </Alert>
      )}
      {error && !loading && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5 !p-0 overflow-hidden border-gray-200 dark:border-gray-700">
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Moderation queue</span>
            {data && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{data.total} total</span>
            )}
          </div>
          <div className="min-h-[200px] max-h-[min(70vh,560px)] overflow-y-auto relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/40 z-10">
                <Spinner />
              </div>
            )}
            {!loading && data && data.items.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>No reports match these criteria.</p>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  Try Queue view for unresolved reports or switch to All reports.
                </p>
              </div>
            )}
            {data?.items.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => selectRow(row)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 transition-colors ${
                  selected?.id === row.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/40'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">{row.subject}</span>
                  <ReclamationStatusBadge status={row.status} />
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                  <div>
                    {row.username ? (
                      <Link
                        to={`/u/${row.username}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        @{row.username}
                      </Link>
                    ) : (
                      <span>User</span>
                    )}
                    {row.userEmail && <span className="ml-2 opacity-90">{row.userEmail}</span>}
                  </div>
                  <div>
                    {RECLAMATION_CATEGORY_LABELS[row.category as ReclamationCategory] ?? row.category} ┬╖{' '}
                    {formatDateEn(row.createdAt)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {row.status === 'open' ? 'Needs triage' : row.status === 'read' ? 'Being reviewed' : 'Closed'}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1 text-xs"
                    disabled={rowSavingId === row.id || row.status === 'read'}
                    onClick={(e) => {
                      e.stopPropagation();
                      void updateStatus(row.id, 'read');
                    }}
                  >
                    Mark reviewed
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1 text-xs"
                    disabled={rowSavingId === row.id || row.status === 'resolved'}
                    onClick={(e) => {
                      e.stopPropagation();
                      void updateStatus(row.id, 'resolved');
                    }}
                  >
                    Resolve
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="!px-2.5 !py-1 text-xs"
                    disabled={rowSavingId === row.id || row.status === 'cancelled'}
                    onClick={(e) => {
                      e.stopPropagation();
                      void updateStatus(row.id, 'cancelled');
                    }}
                  >
                    Close
                  </Button>
                </div>
              </button>
            ))}
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3 text-sm">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-gray-600 dark:text-gray-400">
                Page {data.page} / {data.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= data.totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-7 min-h-[320px]">
          {!selected && (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 text-sm px-4">
              Select a report from the list to view its message and update status.
            </div>
          )}
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <ReclamationStatusBadge status={selected.status} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {RECLAMATION_CATEGORY_LABELS[selected.category as ReclamationCategory] ?? selected.category}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selected.subject}</h2>
              <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <p>
                  <span className="text-gray-500 dark:text-gray-400">User: </span>
                  {selected.username ? (
                    <Link to={`/u/${selected.username}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      @{selected.username}
                    </Link>
                  ) : (
                    'ΓÇö'
                  )}
                </p>
                {selected.userEmail && (
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Email: </span>
                    {selected.userEmail}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Received on {formatDateEn(selected.createdAt)} ┬╖ id {selected.id}
                </p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-100">
                <p className="font-semibold">Moderation shortcuts</p>
                <p className="mt-1 text-xs text-indigo-800/90 dark:text-indigo-200/80">
                  Use quick actions from the list for triage, or update the status here when you need details.
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Message</p>
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                  {selected.message}
                </p>
              </div>
              <div>
                <label htmlFor="admin-reclamation-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  id="admin-reclamation-status"
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as ReclamationStatus)}
                  className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {(Object.keys(RECLAMATION_STATUS_LABELS) as ReclamationStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {RECLAMATION_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Use "Under review" once you start investigating; mark as "Resolved" when fixed. Use "Cancelled" if
                  the user withdrew the report (you can also set it manually).
                </p>
              </div>
              <Button
                type="button"
                loading={saving}
                disabled={statusDraft === selected.status}
                onClick={() => void saveStatus()}
              >
                Save status
              </Button>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

export default AdminReclamations;
