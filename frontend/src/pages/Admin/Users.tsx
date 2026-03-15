/**
 * User Management – admin only.
 * List, search, filter, and update user roles and active status.
 * Self-demotion and self-deactivation are blocked (backend + UI).
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { adminApi } from '../../services/api';
import { Button, Input, Card, Alert, PageContainer, Spinner } from '../../shared/components';
import type { RootState } from '../../store/store';

type Role = 'user' | 'moderator' | 'admin';

interface UserRow {
  _id: string;
  email: string;
  username: string;
  displayName?: string;
  roles?: string[];
  isAdmin?: boolean;
  isActive?: boolean;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

interface ListResponse {
  items: UserRow[];
  total: number;
  limit: number;
  page: number;
}

const ROLES: Role[] = ['user', 'moderator', 'admin'];
const PAGE_SIZE = 20;

function AdminUsers() {
  const currentUserId = useSelector((s: RootState) => s.auth.user?.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [verifiedFilter, setVerifiedFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: PAGE_SIZE,
        q: query.trim() || undefined,
        role: roleFilter || undefined,
        isActive: activeFilter === '' ? undefined : activeFilter === 'true',
        emailVerified: verifiedFilter === '' ? undefined : verifiedFilter === 'true',
      };
      const res = await adminApi.listUsers(params);
      setData(res.data as ListResponse);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || (err instanceof Error ? err.message : 'Failed to load users'));
    } finally {
      setLoading(false);
    }
  }, [page, query, roleFilter, activeFilter, verifiedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleResetFilters = () => {
    setQuery('');
    setRoleFilter('');
    setActiveFilter('');
    setVerifiedFilter('');
    setPage(1);
  };

  const isSelf = (userId: string) => currentUserId && String(userId) === String(currentUserId);

  const handleToggleActive = async (user: UserRow) => {
    if (isSelf(user._id)) {
      setError('You cannot deactivate your own account.');
      return;
    }
    if (!window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.email}?`)) {
      return;
    }
    setUpdatingId(user._id);
    setError('');
    setSuccess('');
    try {
      await adminApi.updateUser(user._id, { isActive: !user.isActive });
      setSuccess(user.isActive ? 'User deactivated.' : 'User activated.');
      await load();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSetRole = async (user: UserRow, role: Role) => {
    if (isSelf(user._id) && role !== 'admin') {
      setError('You cannot remove your own admin role.');
      return;
    }
    const currentRoles = user.roles?.length ? user.roles : (user.isAdmin ? ['admin'] : ['user']);
    if (currentRoles.includes(role) && currentRoles.length === 1) return;
    if (!window.confirm(`Set role of ${user.email} to "${role}"?`)) return;
    setUpdatingId(user._id);
    setError('');
    setSuccess('');
    try {
      await adminApi.setUserRole(user._id, role);
      setSuccess(`Role set to ${role}.`);
      await load();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || 'Update failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const displayRoles = (u: UserRow) => {
    const roles = u.roles?.length ? u.roles : (u.isAdmin ? ['admin'] : ['user']);
    return roles.join(', ');
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage user roles and account status. Only administrators can access this page.
          </p>
        </div>
        <Link
          to="/admin/gamification"
          className="text-indigo-500 dark:text-indigo-400 hover:underline text-sm font-medium"
        >
          Gamification stats →
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-6">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by email, username, or display name"
          className="flex-1 min-w-[200px]"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 min-w-[120px]"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 min-w-[120px]"
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-blue-500 min-w-[140px]"
        >
          <option value="">Email verified</option>
          <option value="true">Verified</option>
          <option value="false">Not verified</option>
        </select>
        <Button type="submit">Search</Button>
        <Button type="button" variant="secondary" onClick={handleResetFilters}>
          Reset filters
        </Button>
      </form>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}
      {success && <Alert variant="success" className="mb-4">{success}</Alert>}

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-900/60">
              <tr className="text-left">
                <th className="p-3 text-gray-300 font-medium">Email</th>
                <th className="p-3 text-gray-300 font-medium">Username</th>
                <th className="p-3 text-gray-300 font-medium">Role</th>
                <th className="p-3 text-gray-300 font-medium">Status</th>
                <th className="p-3 text-gray-300 font-medium">Verified</th>
                <th className="p-3 text-gray-300 font-medium">Joined</th>
                <th className="p-3 text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="p-8 text-center text-gray-400" colSpan={7}>
                    <div className="flex justify-center items-center gap-2">
                      <Spinner size="md" />
                      <span>Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : (
                (data?.items ?? []).map((u) => (
                  <tr key={u._id} className="border-t border-gray-700 hover:bg-gray-800/50">
                    <td className="p-3 text-gray-200">{u.email}</td>
                    <td className="p-3 text-gray-200">@{u.username}</td>
                    <td className="p-3 text-gray-200">{displayRoles(u)}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          u.isActive !== false
                            ? 'bg-green-900/40 text-green-300'
                            : 'bg-red-900/40 text-red-300'
                        }`}
                      >
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-200">
                      {u.emailVerifiedAt ? (
                        <span className="text-green-400">Yes</span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-400">
                      {u.createdAt
                        ? new Date(u.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <Button
                          type="button"
                          variant="secondary"
                          className="!py-1 !px-3 text-xs"
                          disabled={isSelf(u._id) || updatingId === u._id}
                          onClick={() => handleToggleActive(u)}
                        >
                          {updatingId === u._id ? '…' : u.isActive !== false ? 'Deactivate' : 'Activate'}
                        </Button>
                        {ROLES.map((role) => {
                          const userRoles = u.roles?.length ? u.roles : (u.isAdmin ? ['admin'] : ['user']);
                          const isCurrentRole = userRoles.includes(role);
                          return (
                            <button
                              key={role}
                              type="button"
                              disabled={
                                (isSelf(u._id) && role !== 'admin') || updatingId === u._id
                              }
                              onClick={() => handleSetRole(u, role)}
                              className={`!py-1 !px-3 text-xs rounded font-medium transition ${
                                isCurrentRole
                                  ? 'bg-blue-600 text-white cursor-default'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                              }`}
                            >
                              {role}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data && !loading && (
          <div className="flex items-center justify-between p-4 border-t border-gray-700 flex-wrap gap-4">
            <div className="text-gray-400 text-sm">
              {data.total} user{data.total !== 1 ? 's' : ''} — Page {data.page} of {Math.ceil(data.total / data.limit) || 1}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={data.page * data.limit >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </PageContainer>
  );
}

export default AdminUsers;
