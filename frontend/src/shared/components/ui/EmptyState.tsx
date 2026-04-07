import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('bb-empty-state text-center', className)} role="status" aria-live="polite" tabIndex={0}>
      {icon ? <div className="mb-3 text-slate-500 dark:text-slate-400">{icon}</div> : null}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description ? <p className="mt-1 max-w-md text-sm text-slate-600 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

