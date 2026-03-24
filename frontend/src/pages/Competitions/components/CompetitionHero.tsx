import { memo } from 'react';
import { Clock } from 'lucide-react';
import type { CompetitionDetail } from '../types';
import { CompetitionStatusBadge } from './CompetitionStatusBadge';
import { CompetitionTypeBadge } from './CompetitionTypeBadge';

interface CompetitionHeroProps {
  competition: CompetitionDetail;
  className?: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function CompetitionHeroComponent({ competition, className = '' }: CompetitionHeroProps) {
  return (
    <header className={className}>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <CompetitionTypeBadge type={competition.type as any} />
        <CompetitionStatusBadge status={competition.status as any} />
        <span className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400" aria-label="Contest period">
          <Clock className="w-4 h-4" aria-hidden />
          {formatDate(competition.startTime)} – {formatDate(competition.endTime)}
        </span>
      </div>
      <h1 className="text-2xl font-bold text-emerald-400 mb-2">{competition.name}</h1>
    </header>
  );
}

export const CompetitionHero = memo(CompetitionHeroComponent);
