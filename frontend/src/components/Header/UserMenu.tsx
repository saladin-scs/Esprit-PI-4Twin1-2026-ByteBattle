import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import { Avatar, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../shared/components';
import {
  IconUser,
  IconLayoutDashboard,
  IconCog,
  IconShield,
  IconLogout,
} from './HeaderIcons';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const isAdmin = Boolean(user?.roles?.includes('admin'));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLogoutConfirm(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const displayName = user?.displayName || user?.username || 'User';
  const avatarUrl = user?.avatarUrl ?? null;

  const handleLogoutClick = () => {
    setOpen(false);
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setShowLogoutConfirm(false);
    dispatch(logout());
    navigate('/');
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowLogoutConfirm(false);
    }
  };

  const trigger = (
    <button
      type="button"
      className="flex items-center gap-2 rounded-full p-0.5 ring-2 ring-transparent hover:ring-gray-300 dark:hover:ring-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
      aria-label="Open user menu"
    >
      <Avatar src={avatarUrl} fallback={displayName} size="md" />
    </button>
  );

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen} trigger={trigger} align="end" className="min-w-[14rem]">
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-600">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{displayName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">@{user?.username}</p>
        </div>
        <div className="py-1">
          <DropdownMenuItem to={`/u/${user?.username}`} icon={<IconUser />}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem to="/dashboard" icon={<IconLayoutDashboard />}>
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem to="/settings/profile" icon={<IconCog />}>
            Settings
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem to="/admin/users" icon={<IconShield />}>
              Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogoutClick}
            icon={<IconLogout />}
            className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenu>

      {showLogoutConfirm && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Confirmer la déconnexion
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleLogoutCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
} 