import { useCallback, useEffect, useState } from 'react';
import { reclamationsApi, type ReclamationMineItem, type ReclamationStatus } from '../../services/api';
import { Button, Card, PageContainer, Alert, Modal } from '../../shared/components';
// Removed RECLAMATION_CATEGORY_LABELS
import { TAG_OPTIONS } from './constants'; // keep only TAG_OPTIONS if needed
import { ReclamationForm } from './components/ReclamationForm';
import { ReclamationStatusBadge } from './components/ReclamationStatusBadge';

type Tab = 'mine' | 'new';

function formatDateEn(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function canUserCancel(status: ReclamationStatus) {
  return status === 'open' || status === 'read';
}

function getTagLabel(tag?: string): string {
  if (!tag) return '—';
  const found = TAG_OPTIONS.find(t => t.value === tag);
  return found?.label ?? tag;
}

export function ReclamationScreen() {
  const [tab, setTab] = useState<Tab>('mine');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<ReclamationMineItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<ReclamationMineItem | null>(null);
  const [listError, setListError] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const loadList = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const { data } = await reclamationsApi.listMine({ page, limit });
      setItems(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setSelected((prev) => {
        if (!prev) return null;
        const still = data.items.find((i) => i.id === prev.id);
        return still ?? (data.items[0] ?? null);
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setListError(ax?.response?.data?.message || ax?.message || 'Unable to load your reports.');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    if (tab === 'mine') void loadList();
  }, [tab, loadList]);

  useEffect(() => {
    if (!listLoading && items.length > 0 && selected === null) {
      setSelected(items[0]);
    }
  }, [listLoading, items, selected]);

  const confirmCancelReclamation = async () => {
    if (!selected || !canUserCancel(selected.status)) return;
    setCancelLoading(true);
    setCancelError('');
    try {
      const { data } = await reclamationsApi.cancelMine(selected.id);
      setSelected(data.reclamation);
      setCancelModalOpen(false);
      await loadList();
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setCancelError(
        Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Cancellation failed.',
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const tabClass = (t: Tab) =>
    `rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
      tab === t
        ? 'bg-indigo-600 text-white shadow-md'
        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/60'
    }`;

  return (
    <PageContainer maxWidth="xl" className="mt-6 mb-12">
      <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/90 via-white to-violet-50/80 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950/40 px-4 py-6 sm:px-8 sm:py-8 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          Reports
        </h1>
        <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
          Review your report status, cancel open ones if needed, or submit a new report.
          The team may contact you using your account email.
        </p>
        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Report sections">
          <button type="button" role="tab" aria-selected={tab === 'mine'} className={tabClass('mine')} onClick={() => setTab('mine')}>
            My reports
            {total > 0 && (
              <span className="ml-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs">{total}</span>
            )}
          </button>
          <button type="button" role="tab" aria-selected={tab === 'new'} className={tabClass('new')} onClick={() => setTab('new')}>
            New report
          </button>
        </div>
      </div>

      {tab === 'mine' && (
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <Card className="lg:col-span-5 !p-0 overflow-hidden border-gray-200 dark:border-gray-700">
            <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50/80 dark:bg-gray-800/80">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Liste</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select an item to view details</p>
            </div>
            <div className="max-h-[min(70vh,520px)] overflow-y-auto">
              {listLoading && (
                <div className="flex justify-center py-16">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}
              {!listLoading && listError && (
                <div className="p-4">
                  <Alert variant="error">{listError}</Alert>
                </div>
              )}
              {!listLoading && !listError && items.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No reports yet. Go to the "New report" tab to create one.
                </div>
              )}
              {!listLoading &&
                !listError &&
                items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700/80 transition-colors ${
                      selected?.id === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm">
                        {item.subject}
                      </span>
                      <ReclamationStatusBadge status={item.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>{getTagLabel((item as any).tag)}</span>
                      <span aria-hidden>·</span>
                      <time dateTime={item.createdAt}>{formatDateEn(item.createdAt)}</time>
                    </div>
                  </button>
                ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-2 border-t border-gray-200 dark:border-gray-700 px-4 py-3 text-sm">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1 || listLoading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-gray-600 dark:text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page >= totalPages || listLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </Card>

          <Card className="lg:col-span-7 min-h-[280px]">
            {!selected && (
              <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 text-sm px-4">
                <p>Select a report from the list to view the full message and available actions.</p>
              </div>
            )}
            {selected && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <ReclamationStatusBadge status={selected.status} />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getTagLabel((selected as any).tag)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{selected.subject}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Sent on <time dateTime={selected.createdAt}>{formatDateEn(selected.createdAt)}</time>
                </p>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Message</p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                    {selected.message}
                  </p>
                </div>
                {cancelError && !cancelModalOpen && <Alert variant="error">{cancelError}</Alert>}
                {canUserCancel(selected.status) && (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={cancelLoading}
                    onClick={() => {
                      setCancelError('');
                      setCancelModalOpen(true);
                    }}
                  >
                    Cancel this report
                  </Button>
                )}
                {(selected.status === 'resolved' || selected.status === 'cancelled') && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selected.status === 'resolved'
                      ? 'This report is marked as resolved. For a new issue, create a new report.'
                      : 'You cancelled this report.'}
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'new' && (
        <div className="mx-auto max-w-lg">
          <Card>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">New report</h2>
            <ReclamationForm
              onSuccess={() => {
                setSelected(null);
                setPage(1);
                setTab('mine');
              }}
            />
          </Card>
        </div>
      )}

      <Modal
        isOpen={cancelModalOpen && selected != null && canUserCancel(selected.status)}
        onClose={() => !cancelLoading && setCancelModalOpen(false)}
        title="Cancel report?"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            This action is permanent. The team will no longer process this report. You can create a new one if needed.
          </p>
          {cancelError && <Alert variant="error">{cancelError}</Alert>}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setCancelModalOpen(false)} disabled={cancelLoading}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void confirmCancelReclamation()}
              loading={cancelLoading}
              disabled={cancelLoading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Cancel report
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}