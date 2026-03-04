/**
 * Route protégée – affiche les enfants uniquement si l'utilisateur est authentifié.
 * Sinon redirige vers /login (avec returnUrl optionnel).
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store/store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Redirection si non authentifié (défaut: /login) */
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
