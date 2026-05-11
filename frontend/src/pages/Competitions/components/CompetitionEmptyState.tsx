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
    description: 'There are no contests running right now. Check back later or look at scheduled and past contests.',
  },
  scheduled: {
    title: 'No scheduled contests',
    description: 'No upcoming contests are scheduled yet. Stay tuned for new challenges.',
  },
  past: {
    title: 'No past contests',
    description: 'No finished contests to show yet. Participate in active contests to see history here.',
  },
};

function CompetitionEmptyStateComponent({ tab, className = '' }: CompetitionEmptyStateProps) {
  const { title, description } = MESSAGES[tab];
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/30 ${className}`}
      role="status"
    >
      <div className="rounded-full bg-gray-200 dark:bg-gray-700/50 p-4 mb-4" aria-hidden>
        <Trophy className="w-12 h-12 text-gray-500 dark:text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">{description}</p>
    </div>
  );
}

export const CompetitionEmptyState = memo(CompetitionEmptyStateComponent);
