/**
 * Route guard: only users with the admin role can access.
 * Redirects to /dashboard if not authenticated, or / if authenticated but not admin.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, user } = useSelector((s: RootState) => s.auth);
  const location = useLocation();
  const isAdmin = Boolean(user?.roles?.includes('admin'));

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
