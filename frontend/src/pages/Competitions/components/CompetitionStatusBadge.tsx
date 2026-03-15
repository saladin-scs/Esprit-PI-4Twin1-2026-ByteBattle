import type { CompetitionStatus } from '../types';

const STATUS_CONFIG: Record<
  CompetitionStatus,
  { label: string; className: string; ariaLabel: string }
> = {
  scheduled: {
    label: 'Scheduled',
    className: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    ariaLabel: 'Contest is scheduled',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    ariaLabel: 'Contest is active',
  },
  closed: {
    label: 'Finished',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    ariaLabel: 'Contest has ended',
  },
  archived: {
    label: 'Archived',
    className: 'bg-gray-600/30 text-gray-400 border-gray-500/40',
    ariaLabel: 'Contest is archived',
  },
};

interface CompetitionStatusBadgeProps {
  status: CompetitionStatus;
  className?: string;
}

export function CompetitionStatusBadge({ status, className = '' }: CompetitionStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${config.className} ${className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      {config.label}
    </span>
  );
}
