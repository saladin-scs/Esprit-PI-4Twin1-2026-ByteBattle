import type { HTMLAttributes } from 'react';
import { cn } from '../../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const badgeStyles: Record<BadgeVariant, string> = {
  default: 'border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200',
  success: 'border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  warning: 'border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  danger: 'border-red-300 bg-red-100 text-red-900 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200',
  info: 'border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        badgeStyles[variant],
        className,
      )}
      {...props}
    />
  );
}

