import { memo } from 'react';
import type { CompetitionDetail } from '../types';

interface CompetitionOverviewProps {
  competition: CompetitionDetail;
  className?: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function CompetitionOverviewComponent({ competition, className = '' }: CompetitionOverviewProps) {
  const isCodeGolf = competition.type === 'code_golf';
  const overviewItems = [
    competition.status === 'active'
      ? `Contest runs from ${formatDate(competition.startTime)} to ${formatDate(competition.endTime)}.`
      : `Contest ran from ${formatDate(competition.startTime)} to ${formatDate(competition.endTime)}.`,
    'You can update your solution as many times as you want during the contest. A better submission (shorter for Code Golf, faster for Speed) updates your best result. Tiebreakers use the earliest valid submission.',
    isCodeGolf
      ? 'Points go to the shortest solutions that meet the objective, both overall and per language. Same length: earliest submission wins.'
      : competition.type === 'speed'
        ? 'Ranking is by execution time (lowest wins). Ties are broken by submission time.'
        : 'Ranking is by score (problems solved, then execution time).',
    ...(isCodeGolf ? ['Leading and trailing whitespace is trimmed before calculating bytes.'] : []),
    'Input is provided via standard input (STDIN). Output must be written to standard output (STDOUT).',
  ];

  return (
    <section className={className} aria-labelledby="overview-heading">
      <h2 id="overview-heading" className="text-lg font-semibold text-emerald-400 mb-3">
        Overview
      </h2>
      <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
        {overviewItems.map((item, i) => (
          <li key={i} className="pl-1">
            {item}
          </li>
        ))}
      </ol>
    </section>
  );
}

export const CompetitionOverview = memo(CompetitionOverviewComponent);
