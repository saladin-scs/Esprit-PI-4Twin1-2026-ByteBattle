import { useEffect, useMemo, useState } from 'react';
import { apiKeysApi, usersApi, type ApiKeyRow } from '../../services/api';
import { Alert, Button, Card, Input, PageContainer, Spinner } from '../../shared/components';

type CreatedKey = {
  id: string;
  name: string;
  secret: string;
  prefix: string;
  createdAt: string;
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DeveloperSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [name, setName] = useState('My integration key');
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [created, setCreated] = useState<CreatedKey | null>(null);

  const hasKeys = useMemo(() => keys.length > 0, [keys.length]);

  const loadKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiKeysApi.list();
      setKeys(res.data.keys || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to load API keys.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKeys();
  }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    setCreated(null);
    try {
      const res = await apiKeysApi.create(name.trim() || 'My integration key');
      setCreated(res.data);
      setSuccess('API key created. Save the secret now; it will not be shown again.');
      await loadKeys();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to create API key.');
    } finally {
      setSaving(false);
    }
  };

  const onRevoke = async (id: string) => {
    setError('');
    setSuccess('');
    try {
      await apiKeysApi.revoke(id);
      setSuccess('API key revoked.');
      await loadKeys();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to revoke API key.');
    }
  };

  const onExport = async () => {
    setExporting(true);
    setError('');
    setSuccess('');
    try {
      const res = await usersApi.dataExport();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadJson(`bytebattle-data-export-${stamp}.json`, res.data);
      setSuccess('Data export downloaded.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Unable to export account data.');
    } finally {
      setExporting(false);
    }
  };

  const copySecret = async () => {
    if (!created?.secret) return;
    try {
      await navigator.clipboard.writeText(created.secret);
      setSuccess('Secret copied to clipboard.');
    } catch {
      setError('Unable to copy secret automatically.');
    }
  };

  return (
    <PageContainer maxWidth="4xl" className="py-10">
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">Developer & data</h1>

      {(error || success) && (
        <div className="mb-4 space-y-2">
          {error && <Alert variant="error">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
        </div>
      )}

      <div className="space-y-6">
        <Card title="API keys">
          <form onSubmit={onCreate} className="mb-4 flex flex-col gap-3 sm:flex-row">
            <Input
              label="Key name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My integration key"
              className="flex-1"
            />
            <Button type="submit" disabled={saving} loading={saving} className="sm:mt-6">
              Create key
            </Button>
          </form>

          {created && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              <p className="mb-2 font-semibold">New key secret (shown once)</p>
              <p className="mb-2 break-all font-mono">{created.secret}</p>
              <Button type="button" variant="secondary" onClick={copySecret}>
                Copy secret
              </Button>
            </div>
          )}

          {loading ? (
            <div className="py-6">
              <Spinner size="md" />
            </div>
          ) : !hasKeys ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No API keys yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{k.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Prefix: {k.prefix} | Created: {new Date(k.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button type="button" variant="danger" onClick={() => void onRevoke(k.id)}>
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Data export">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Download your account data in JSON format.
          </p>
          <Button type="button" onClick={() => void onExport()} loading={exporting} disabled={exporting}>
            Export my data
          </Button>
        </Card>
      </div>
    </PageContainer>
  );
}
