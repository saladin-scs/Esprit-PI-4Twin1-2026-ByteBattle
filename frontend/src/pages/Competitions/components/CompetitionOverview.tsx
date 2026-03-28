import { memo } from 'react';
import type { CompetitionDetail } from '../types';

interface CompetitionOverviewProps {
  competition: CompetitionDetail;
  challengeTitles?: string[];
  className?: string;
}

function formatDate(s: string): string {
  return new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function CompetitionOverviewComponent({
  competition,
  challengeTitles,
  className = '',
}: CompetitionOverviewProps) {
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
      <h2 id="overview-heading" className="bb-section-title mb-3">
        Overview
      </h2>
      {challengeTitles && challengeTitles.length > 0 && (
        <div className="bb-included-problems">
          <p className="text-xs font-medium uppercase tracking-wide text-primary-800 dark:text-primary-300">
            Included problems
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {challengeTitles.map((t, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-medium text-slate-800 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <span className="bb-problem-index font-semibold">{i + 1}.</span> {t}
              </li>
            ))}
          </ul>
        </div>
      )}
      <ol className="bb-body-text list-inside list-decimal space-y-2 text-sm">
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
