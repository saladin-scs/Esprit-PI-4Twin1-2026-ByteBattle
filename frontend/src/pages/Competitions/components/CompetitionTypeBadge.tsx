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
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 ${className}`}
    >
      <span aria-hidden>{config.icon}</span>
      {config.shortLabel}
    </span>
  );
}
