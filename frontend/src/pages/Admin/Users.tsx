import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-8">Admin - Utilisateurs</h1>

      <form onSubmit={onSearch} className="flex gap-3 mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Recherche email / username / displayName"
          className="flex-1 px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md font-medium">
          Rechercher
        </button>
      </form>

      {error && <div className="bg-red-600 text-white p-3 rounded mb-4">{error}</div>}

      <div className="bg-gray-800 rounded-lg overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-900/60">
            <tr className="text-left">
              <th className="p-3">Email</th>
              <th className="p-3">Username</th>
              <th className="p-3">Roles</th>
              <th className="p-3">Actif</th>
              <th className="p-3">Email vérifié</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-3" colSpan={6}>
                  Chargement…
                </td>
              </tr>
            ) : (
              (data?.items || []).map((u: any) => (
                <tr key={u._id} className="border-t border-gray-700">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{(u.roles || (u.isAdmin ? ['admin'] : ['user'])).join(', ')}</td>
                  <td className="p-3">{u.isActive ? 'Oui' : 'Non'}</td>
                  <td className="p-3">{u.emailVerifiedAt ? 'Oui' : 'Non'}</td>
                  <td className="p-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                      onClick={() => onToggleActive(u._id, u.isActive)}
                    >
                      {u.isActive ? 'Désactiver' : 'Activer'}
                    </button>
                    <button
                      type="button"
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                      onClick={() => onSetRole(u._id, 'user')}
                    >
                      user
                    </button>
                    <button
                      type="button"
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                      onClick={() => onSetRole(u._id, 'moderator')}
                    >
                      moderator
                    </button>
                    <button
                      type="button"
                      className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
                      onClick={() => onSetRole(u._id, 'admin')}
                    >
                      admin
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-gray-400">
            Total: {data.total} — Page {data.page}
          </div>
          <div className="flex gap-2">
            <button
              className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Précédent
            </button>
            <button
              className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded disabled:opacity-50"
              disabled={(data.page * data.limit) >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;

