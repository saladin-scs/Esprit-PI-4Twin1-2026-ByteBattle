import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';
import { Button, Input, Card, Alert, PageContainer, Spinner } from '../../shared/components';

function AdminUsers() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ items: any[]; total: number; limit: number; page: number } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.listUsers({ q: q || undefined, page, limit: 20 });
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await load();
  };

  const onToggleActive = async (id: string, isActive: boolean) => {
    await adminApi.updateUser(id, { isActive: !isActive });
    await load();
  };

  const onSetRole = async (id: string, role: string) => {
    await adminApi.updateUser(id, { roles: [role] });
    await load();
  };

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-white mb-8">Admin - Utilisateurs</h1>

      <form onSubmit={onSearch} className="flex gap-3 mb-6">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Recherche email / username / displayName"
          className="flex-1"
        />
        <Button type="submit">Rechercher</Button>
      </form>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/60">
              <tr className="text-left">
                <th className="p-3 text-gray-300">Email</th>
                <th className="p-3 text-gray-300">Username</th>
                <th className="p-3 text-gray-300">Roles</th>
                <th className="p-3 text-gray-300">Actif</th>
                <th className="p-3 text-gray-300">Email vérifié</th>
                <th className="p-3 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-8 text-center text-gray-400" colSpan={6}>
                    <div className="flex justify-center gap-2">
                      <Spinner size="md" />
                      <span>Chargement…</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (data?.items || []).map((u: any) => (
                  <tr key={u._id} className="border-t border-gray-700">
                    <td className="p-3 text-gray-200">{u.email}</td>
                    <td className="p-3 text-gray-200">{u.username}</td>
                    <td className="p-3 text-gray-200">{(u.roles || (u.isAdmin ? ['admin'] : ['user'])).join(', ')}</td>
                    <td className="p-3 text-gray-200">{u.isActive ? 'Oui' : 'Non'}</td>
                    <td className="p-3 text-gray-200">{u.emailVerifiedAt ? 'Oui' : 'Non'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1 !px-3 text-xs"
                          onClick={() => onToggleActive(u._id, u.isActive)}
                        >
                          {u.isActive ? 'Désactiver' : 'Activer'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="!py-1 !px-3 text-xs"
                          onClick={() => onSetRole(u._id, 'user')}
                        >
                          user
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="!py-1 !px-3 text-xs"
                          onClick={() => onSetRole(u._id, 'moderator')}
                        >
                          moderator
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="!py-1 !px-3 text-xs"
                          onClick={() => onSetRole(u._id, 'admin')}
                        >
                          admin
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && !loading && (
          <div className="flex items-center justify-between p-4 border-t border-gray-700">
            <div className="text-gray-400 text-sm">
              Total: {data.total} — Page {data.page}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Précédent
              </Button>
              <Button
                variant="secondary"
                disabled={(data.page * data.limit) >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

export default AdminUsers;
