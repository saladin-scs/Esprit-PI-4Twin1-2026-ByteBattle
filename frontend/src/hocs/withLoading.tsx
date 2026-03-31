/**
 * HOC: displays a fallback while loading is true, then renders the component.
 */
import { ComponentType } from 'react';

export interface WithLoadingOptions {
  fallback?: React.ReactNode;
}

export function withLoading<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithLoadingOptions = {}
) {
  const { fallback = <div className="flex justify-center p-8">Loading…</div> } = options;

  type Props = P & { loading?: boolean };

  function WithLoadingComponent(props: Props) {
    const { loading = false, ...rest } = props;
    if (loading) return <>{fallback}</>;
    return <WrappedComponent {...(rest as P)} />;
  }

  WithLoadingComponent.displayName = `withLoading(${WrappedComponent.displayName ?? WrappedComponent.name ?? 'Component'})`;
  return WithLoadingComponent;
}
