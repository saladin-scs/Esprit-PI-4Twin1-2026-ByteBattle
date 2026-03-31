import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';
import { Avatar, DropdownMenu, DropdownMenuItem, DropdownMenuSeparator, Modal, Button } from '../../shared/components';
import { authApi } from '../../core/api';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import {
  IconUser,
  IconLayoutDashboard,
  IconCog,
  IconShield,
  IconLogout,
} from './HeaderIcons';

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const location = useLocation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: RootState) => s.auth.user);
  const isAdmin = Boolean(user?.roles?.includes('admin'));

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const displayName = user?.displayName || user?.username || 'User';
  const avatarUrl = user?.avatarUrl ?? null;

  const handleLogoutClick = () => {
    setOpen(false);
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        await authApi.logout(refreshToken).catch(() => {});
      }
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
      dispatch(logout());
      navigate('/');
      toast.success('Successfully logged out');
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
          <DropdownMenuItem to="/settings/developer" icon={<KeyRound className="h-4 w-4" aria-hidden />}>
            Developer & data
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuItem to="/admin/users" icon={<IconShield />}>
                Admin - Users
              </DropdownMenuItem>
              <DropdownMenuItem to="/admin/reclamations" icon={<IconShield />}>
                Admin - Reports
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogoutClick} icon={<IconLogout />} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
            Log out
          </DropdownMenuItem>
        </div>
      </DropdownMenu>

      <Modal
        isOpen={showLogoutModal}
        onClose={() => !isLoggingOut && setShowLogoutModal(false)}
        title="Sign Out"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to sign out of your account? Any unsaved changes on the current page will be lost.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={confirmLogout}
              loading={isLoggingOut}
              disabled={isLoggingOut}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

