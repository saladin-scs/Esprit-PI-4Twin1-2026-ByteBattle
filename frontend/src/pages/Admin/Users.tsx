/**
 * User Management – admin only.
 * List, search, filter, and update user roles and active status.
 * Self-demotion and self-deactivation are blocked (backend + UI).
 */
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { adminApi } from '../../services/api';
import { Button, Input, Card, Alert, PageContainer, Spinner, Modal } from '../../shared/components';
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

/** Libellés affichés pour les 3 rôles assignables par l’admin. */
const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  moderator: 'Moderator',
  admin: 'Admin',
};

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
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { type: 'toggle-active'; user: UserRow }
    | { type: 'set-role'; user: UserRow; role: Role }
  >(null);
  const [confirmPending, setConfirmPending] = useState(false);

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
      const res = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number; data?: { message?: string } } }).response
        : undefined;
      const msg = res?.data?.message;
      if (res?.status === 403) {
        setError(
          msg ||
            'Accès refusé : compte non administrateur ou rôles pas encore pris en compte. Lance `npm run make-admin -- ton@email.com` depuis backend/, puis rafraîchis la page.',
        );
      } else {
        setError(msg || (err instanceof Error ? err.message : 'Failed to load users'));
      }
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

  const openToggleActiveConfirm = (user: UserRow) => {
    if (isSelf(user._id)) {
      setError('You cannot deactivate your own account.');
      return;
    }
    setError('');
    setSuccess('');
    setConfirmAction({ type: 'toggle-active', user });
  };

  const openSetRoleConfirm = (user: UserRow, role: Role) => {
    if (isSelf(user._id) && role !== 'admin') {
      setError('You cannot remove your own admin role.');
      return;
    }
    const currentRoles = user.roles?.length ? user.roles : (user.isAdmin ? ['admin'] : ['user']);
    if (currentRoles.includes(role) && currentRoles.length === 1) return;
    setError('');
    setSuccess('');
    setConfirmAction({ type: 'set-role', user, role });
  };

  const closeConfirmModal = () => {
    if (!confirmPending) setConfirmAction(null);
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const user = confirmAction.user;
    setConfirmPending(true);
    setUpdatingId(user._id);
    setError('');
    setSuccess('');
    try {
      if (confirmAction.type === 'toggle-active') {
        await adminApi.updateUser(user._id, { isActive: !user.isActive });
        setSuccess(user.isActive !== false ? 'User deactivated.' : 'User activated.');
      } else {
        await adminApi.setUserRole(user._id, confirmAction.role);
        setSuccess(`Role set to ${ROLE_LABELS[confirmAction.role]}.`);
      }
      setConfirmAction(null);
      await load();
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : null;
      setError(msg || 'Update failed');
    } finally {
      setConfirmPending(false);
      setUpdatingId(null);
    }
  };

  const displayRoles = (u: UserRow) => {
    const roles = u.roles?.length ? u.roles : (u.isAdmin ? ['admin'] : ['user']);
    return roles.map((r) => ROLE_LABELS[r as Role] ?? r).join(', ');
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
          className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          className="min-w-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Any status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={(e) => setVerifiedFilter(e.target.value)}
          className="min-w-[140px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            <thead className="bg-slate-100 dark:bg-gray-900/80">
              <tr className="text-left">
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Email</th>
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Username</th>
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Role</th>
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Status</th>
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Verified</th>
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Joined</th>
                <th className="p-3 font-medium text-slate-700 dark:text-gray-300">Actions</th>
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
                  <tr
                    key={u._id}
                    className="border-t border-gray-200 hover:bg-slate-50 dark:border-gray-700 dark:hover:bg-gray-800/50"
                  >
                    <td className="p-3 text-slate-900 dark:text-gray-200">{u.email}</td>
                    <td className="p-3 text-slate-900 dark:text-gray-200">@{u.username}</td>
                    <td className="p-3 text-slate-900 dark:text-gray-200">{displayRoles(u)}</td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${
                          u.isActive !== false
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                        }`}
                      >
                        {u.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-900 dark:text-gray-200">
                      {u.emailVerifiedAt ? (
                        <span className="text-green-700 dark:text-green-400">Yes</span>
                      ) : (
                        <span className="text-slate-600 dark:text-gray-500">No</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 dark:text-gray-400">
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
                          onClick={() => openToggleActiveConfirm(u)}
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
                              title={`Set role to ${ROLE_LABELS[role]}`}
                              disabled={
                                (isSelf(u._id) && role !== 'admin') || updatingId === u._id || isCurrentRole
                              }
                              onClick={() => openSetRoleConfirm(u, role)}
                              className={`rounded px-3 py-1 text-xs font-medium transition ${
                                isCurrentRole
                                  ? 'cursor-default bg-blue-600 text-white ring-2 ring-blue-400/50'
                                  : 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {ROLE_LABELS[role]}
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
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 p-4 dark:border-gray-700">
            <div className="text-sm text-slate-600 dark:text-gray-400">
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

      <Modal
        isOpen={confirmAction !== null}
        onClose={closeConfirmModal}
        title={
          confirmAction?.type === 'toggle-active'
            ? confirmAction.user.isActive !== false
              ? 'Deactivate account'
              : 'Activate account'
            : 'Change role'
        }
      >
        <div className="space-y-4">
          {confirmAction?.type === 'toggle-active' ? (
            <p className="text-gray-600 dark:text-gray-300">
              {confirmAction.user.isActive !== false ? (
                <>
                  Deactivate <span className="font-medium text-gray-900 dark:text-white">{confirmAction.user.email}</span>
                  ? They will no longer be able to sign in until the account is activated again.
                </>
              ) : (
                <>
                  Activate <span className="font-medium text-gray-900 dark:text-white">{confirmAction.user.email}</span>
                  ? They will be able to sign in again.
                </>
              )}
            </p>
          ) : confirmAction?.type === 'set-role' ? (
            <p className="text-gray-600 dark:text-gray-300">
              Set role of{' '}
              <span className="font-medium text-gray-900 dark:text-white">{confirmAction.user.email}</span> to{' '}
              <span className="font-medium text-primary-600 dark:text-primary-400">
                &quot;{ROLE_LABELS[confirmAction.role]}&quot;
              </span>
              ? This updates their permissions immediately.
            </p>
          ) : null}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={closeConfirmModal} disabled={confirmPending}>
              Cancel
            </Button>
            {confirmAction?.type === 'toggle-active' && confirmAction.user.isActive !== false ? (
              <Button
                type="button"
                variant="primary"
                onClick={() => void runConfirmedAction()}
                loading={confirmPending}
                disabled={confirmPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Deactivate
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={() => void runConfirmedAction()}
                loading={confirmPending}
                disabled={confirmPending}
                className={
                  confirmAction?.type === 'toggle-active'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : ''
                }
              >
                {confirmAction?.type === 'toggle-active' ? 'Activate' : 'Confirm'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </PageContainer>
  );
}

export default AdminUsers;
