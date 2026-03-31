/**
 * HOC: injects authentication condition and redirects when not logged in.
 */
import { ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

export interface WithAuthOptions {
  redirectTo?: string;
  fallback?: React.ReactNode;
}

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithAuthOptions = {}
) {
  const { redirectTo = '/login', fallback = null } = options;

  function WithAuthComponent(props: P) {
    const isAuthenticated = useSelector((s: RootState) => !!s.auth.token);
    const navigate = useNavigate();
    const location = useLocation();

    if (!isAuthenticated) {
      if (fallback) return <>{fallback}</>;
      navigate(redirectTo, { state: { from: location }, replace: true });
      return null;
    }

    return <WrappedComponent {...props} />;
  }

  WithAuthComponent.displayName = `withAuth(${WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'})`;
  return WithAuthComponent;
}
