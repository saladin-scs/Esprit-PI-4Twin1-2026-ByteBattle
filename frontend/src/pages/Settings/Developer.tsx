import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { KeyRound, Download } from 'lucide-react';
import { RootState } from '../../store/store';
import { apiKeysApi, usersApi, type ApiKeyRow } from '../../services/api';
import { Button, Input, Card, Alert, PageContainer, Modal } from '../../shared/components';
import toast from 'react-hot-toast';

export default function DeveloperSettings() {
  const { isAuthenticated } = useSelector((s: RootState) => s.auth);
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [newSecret, setNewSecret] = useState<string | null>(null);
  const [revokeKeyId, setRevokeKeyId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadKeys = async () => {
    try {
      const { data } = await apiKeysApi.list();
      setKeys(data.keys || []);
    } catch {
      setKeys([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated) void loadKeys();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNewSecret(null);
    if (!name.trim()) return;
    setLoading(true);
    try {
      const { data } = await apiKeysApi.create(name.trim());
      setNewSecret(data.secret);
      setName('');
      toast.success('Key created — copy the secret now.');
      await loadKeys();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const confirmRevoke = async () => {
    if (!revokeKeyId) return;
    setRevoking(true);
    try {
      await apiKeysApi.revoke(revokeKeyId);
      toast.success('API key revoked');
      setRevokeKeyId(null);
      await loadKeys();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Something went wrong');
    } finally {
      setRevoking(false);
    }
  };

  const onExport = async () => {
    setExporting(true);
    setError('');
    try {
      const { data } = await usersApi.dataExport();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bytebattle-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <PageContainer maxWidth="2xl" className="py-12">
      <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-white">Developer & data</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-400">
        API keys for scripts and integrations (header{' '}
        <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">Authorization: Bearer bb_live_…</code> or{' '}
        <code className="rounded bg-slate-200 px-1 dark:bg-slate-700">X-Api-Key</code>). JSON export for compliance and
        archives.
      </p>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      <Card className="mb-8 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
          <KeyRound className="h-5 w-5" aria-hidden />
          API keys
        </h2>
        {newSecret && (
          <Alert variant="info" className="mb-4">
            <strong>Secret (shown once):</strong>{' '}
            <code className="break-all text-xs">{newSecret}</code>
          </Alert>
        )}
        <form onSubmit={onCreate} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Name (e.g. INFO301 class)
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Label" disabled={loading} />
          </div>
          <Button type="submit" loading={loading} disabled={loading}>
            Create key
          </Button>
        </form>
        <ul className="divide-y divide-gray-200 dark:divide-gray-600">
          {keys.length === 0 ? (
            <li className="py-4 text-sm text-gray-500">No API keys yet.</li>
          ) : (
            keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{k.name}</div>
                  <div className="text-xs text-gray-500">
                    {k.prefix}… · created {k.createdAt}
                    {k.lastUsedAt ? ` · last used ${k.lastUsedAt}` : ''}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  className="!py-1.5 !px-3"
                  disabled={loading || revoking}
                  onClick={() => setRevokeKeyId(k.id)}
                >
                  Revoke
                </Button>
              </li>
            ))
          )}
        </ul>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
          <Download className="h-5 w-5" aria-hidden />
          Data export (GDPR)
        </h2>
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Download a JSON copy of your profile, submissions, notifications, claims, and more (passwords and key hashes are
          not included).
        </p>
        <Button type="button" variant="secondary" loading={exporting} disabled={exporting} onClick={() => void onExport()}>
          Download JSON
        </Button>
      </Card>

      <Modal
        isOpen={revokeKeyId != null}
        onClose={() => !revoking && setRevokeKeyId(null)}
        title="Revoke API key?"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to revoke this key? Any scripts or integrations using it will stop working immediately.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setRevokeKeyId(null)} disabled={revoking}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void confirmRevoke()}
              loading={revoking}
              disabled={revoking}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Revoke
            </Button>
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}
