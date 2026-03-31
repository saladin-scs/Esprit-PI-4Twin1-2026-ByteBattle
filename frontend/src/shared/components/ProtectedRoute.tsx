/**
 * Protected route: renders children only when the user is authenticated.
 * Otherwise redirects to /login (with optional returnUrl).
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Redirect target when unauthenticated (default: /login) */
  loginPath?: string;
}

export function ProtectedRoute({ children, loginPath = '/login' }: ProtectedRouteProps) {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to={loginPath}
        state={{ from: location }}
        replace
      />
    );
  }

  return <>{children}</>;
}
