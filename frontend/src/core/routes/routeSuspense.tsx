/**
 * Suspense helpers for lazy routes (React components only — Fast Refresh friendly).
 */
import { Suspense, type ComponentType } from 'react';

const PageFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
  </div>
);

export function SuspensePageFallback() {
  return <PageFallback />;
}

export function withSuspense<P extends object>(Component: ComponentType<P>) {
  return function LazyWithSuspense(props: P) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
