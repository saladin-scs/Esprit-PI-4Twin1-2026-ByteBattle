import { memo } from 'react';
import { Clock, Puzzle } from 'lucide-react';
import type { CompetitionDetail } from '../types';
import { CompetitionStatusBadge } from './CompetitionStatusBadge';
import { CompetitionTypeBadge } from './CompetitionTypeBadge';
import { getCompetitionTimeHint } from '../utils/competitionTiming';

interface CompetitionHeroProps {
  competition: CompetitionDetail;
  challengeCount?: number;
  className?: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function CompetitionHeroComponent({
  competition,
  challengeCount = competition.challengeIds?.length ?? 0,
  className = '',
}: CompetitionHeroProps) {
  const timeHint = getCompetitionTimeHint(
    competition.startTime,
    competition.endTime,
    competition.status,
  );
  return (
    <header className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <CompetitionTypeBadge type={competition.type as any} />
        <CompetitionStatusBadge status={competition.status as any} />
        {challengeCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Puzzle className="h-3.5 w-3.5" aria-hidden />
            {challengeCount} problem{challengeCount !== 1 ? 's' : ''}
          </span>
        )}
        <span className="bb-body-text flex items-center gap-1.5 text-sm" aria-label="Contest period">
          <Clock className="h-4 w-4 text-slate-400" aria-hidden />
          {formatDate(competition.startTime)} – {formatDate(competition.endTime)}
        </span>
        {timeHint && (
          <span className="w-full text-sm font-medium text-amber-800 dark:text-amber-200 sm:w-auto">
            {timeHint}
          </span>
        )}
      </div>
      <h1 className="bb-title-gradient text-2xl sm:text-3xl">{competition.name}</h1>
    </header>
  );
}

export const CompetitionHero = memo(CompetitionHeroComponent);
