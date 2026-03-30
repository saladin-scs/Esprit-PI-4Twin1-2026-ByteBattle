/**
 * Gestion des réclamations utilisateurs (admin).
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminReclamationRow } from '../../core/api';
import { Button, Input, Card, Alert, PageContainer, Spinner, Breadcrumbs, EmptyState } from '../../shared/components';
import {
  RECLAMATION_CATEGORY_LABELS,
  RECLAMATION_STATUS_LABELS,
} from '../../modules/reclamation/constants';
import type { ReclamationCategory, ReclamationStatus } from '../../services/api';
import { ReclamationStatusBadge } from '../../modules/reclamation/components/ReclamationStatusBadge';

const PAGE_SIZE = 15;

function formatDateFr(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Tous les statuts' },
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
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{
    items: AdminReclamationRow[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [selected, setSelected] = useState<AdminReclamationRow | null>(null);
  const [statusDraft, setStatusDraft] = useState<ReclamationStatus>('open');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.listReclamations({
        page,
        limit: PAGE_SIZE,
        q: appliedQuery.trim() || undefined,
        status: statusFilter || undefined,
      });
      setData({
        items: res.data.items,
        total: res.data.total,
        page: res.data.page,
        totalPages: res.data.totalPages,
      });
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
        setError(msg || 'Accès refusé : droits administrateur requis.');
      } else {
        setError(msg || (err instanceof Error ? err.message : 'Chargement impossible.'));
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, appliedQuery, statusFilter]);

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
    setSaving(true);
    setSuccess('');
    setError('');
    try {
      const res = await adminApi.patchReclamationStatus(selected.id, statusDraft);
      setSuccess('Statut mis à jour.');
      setSelected(res.data.reclamation);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((i) => (i.id === res.data.reclamation.id ? res.data.reclamation : i)),
        };
      });
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = ax?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || ax?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  const selectRow = (row: AdminReclamationRow) => {
    setSelected(row);
    setSuccess('');
    setError('');
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      <Breadcrumbs className="mb-4" items={[{ label: 'Admin' }, { label: 'Réclamations' }]} />
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Réclamations</h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl">
            Consulter les demandes des utilisateurs, filtrer par statut et mettre à jour le suivi (en attente, prise en
            compte, résolu).
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to="/admin/users"
            className="text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
          >
            ← Utilisateurs
          </Link>
          <Link
            to="/admin/gamification"
            className="text-indigo-500 dark:text-indigo-400 hover:underline font-medium"
          >
            Gamification →
          </Link>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <Input
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Recherche (sujet, message, e-mail, pseudo…)"
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
        <Button type="submit" variant="secondary">
          Rechercher
        </Button>
      </form>

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
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Liste</span>
            {data && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{data.total} au total</span>
            )}
          </div>
          <div className="min-h-[200px] max-h-[min(70vh,560px)] overflow-y-auto relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/40 z-10">
                <Spinner />
              </div>
            )}
            {!loading && data && data.items.length === 0 && (
              <div className="p-4">
                <EmptyState
                  title="Aucun résultat"
                  description="Aucune réclamation ne correspond aux critères. Essaie d'élargir les filtres."
                />
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
                      <span>Utilisateur</span>
                    )}
                    {row.userEmail && <span className="ml-2 opacity-90">{row.userEmail}</span>}
                  </div>
                  <div>
                    {RECLAMATION_CATEGORY_LABELS[row.category as ReclamationCategory] ?? row.category} ·{' '}
                    {formatDateFr(row.createdAt)}
                  </div>
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
                Précédent
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
                Suivant
              </Button>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-7 min-h-[320px]">
          {!selected && (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 text-sm px-4">
              Sélectionne une réclamation dans la liste pour afficher le message et modifier le statut.
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
                  <span className="text-gray-500 dark:text-gray-400">Utilisateur : </span>
                  {selected.username ? (
                    <Link to={`/u/${selected.username}`} className="text-indigo-600 dark:text-indigo-400 hover:underline">
                      @{selected.username}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
                {selected.userEmail && (
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">E-mail : </span>
                    {selected.userEmail}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Reçue le {formatDateFr(selected.createdAt)} · id {selected.id}
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
                  Statut
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
                  « Prise en compte » lorsque tu as lu le dossier ; « Résolue » une fois le problème traité. « Annulée » si
                  l’utilisateur a retiré sa demande (tu peux aussi l’indiquer manuellement).
                </p>
              </div>
              <Button
                type="button"
                loading={saving}
                disabled={statusDraft === selected.status}
                onClick={() => void saveStatus()}
              >
                Enregistrer le statut
              </Button>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

export default AdminReclamations;
