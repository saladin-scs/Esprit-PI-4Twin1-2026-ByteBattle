import { memo } from 'react';
import { Trophy } from 'lucide-react';
import type { CompetitionTab } from '../types';

interface CompetitionEmptyStateProps {
  tab: CompetitionTab;
  className?: string;
}

const MESSAGES: Record<CompetitionTab, { title: string; description: string }> = {
  active: {
    title: 'No active contests',
    description: 'There are no contests running right now. Check scheduled or past contests.',
  },
  scheduled: {
    title: 'No scheduled contests',
    description: 'No upcoming contests yet. Stay tuned.',
  },
  past: {
    title: 'No past contests',
    description: 'No finished contests to show yet.',
  },
};

function CompetitionEmptyStateComponent({ tab, className = '' }: CompetitionEmptyStateProps) {
  const { title, description } = MESSAGES[tab];
  return (
    <div className={`bb-empty-state ${className}`} role="status">
      <div className="mb-4 rounded-full bg-primary-500/10 p-4 dark:bg-primary-500/15" aria-hidden>
        <Trophy className="h-12 w-12 text-primary-500 dark:text-primary-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="bb-body-text max-w-sm text-center text-sm">{description}</p>
    </div>
  );
}

export const CompetitionEmptyState = memo(CompetitionEmptyStateComponent);
