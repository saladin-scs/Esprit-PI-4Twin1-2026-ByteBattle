import type { CompetitionType } from '../types';
import { COMPETITION_TYPE_CONFIG } from '../types';

interface CompetitionTypeBadgeProps {
  type: CompetitionType;
  className?: string;
}

export function CompetitionTypeBadge({ type, className = '' }: CompetitionTypeBadgeProps) {
  const config = COMPETITION_TYPE_CONFIG[type];
  if (!config) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-primary-500/35 bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-300 ${className}`}
    >
      <span aria-hidden>{config.icon}</span>
      {config.shortLabel}
    </span>
  );
}
