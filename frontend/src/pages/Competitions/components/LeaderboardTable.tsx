import { memo } from 'react';
import { Trophy, Filter } from 'lucide-react';
import type { CompetitionType } from '../types';
import type { LeaderboardEntry } from '../types';
import { LeaderboardRow } from './LeaderboardRow';
import { Spinner } from '../../../shared/components';
import { cn } from '../../../lib/utils';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  type: CompetitionType;
  loading?: boolean;
  languageFilter: string;
  onLanguageFilterChange: (lang: string) => void;
  supportedLanguages: string[];
  className?: string;
}

const LANG_LABEL: Record<string, string> = {
  javascript: 'JS',
  python: 'Py',
  java: 'Java',
  cpp: 'C++',
};

function LeaderboardTableComponent({
  entries,
  type,
  loading,
  languageFilter,
  onLanguageFilterChange,
  supportedLanguages,
  className = '',
}: LeaderboardTableProps) {
  const showLanguageFilter = supportedLanguages.length > 1;

  return (
    <aside className={cn('bb-lb-aside', className)} aria-labelledby="leaderboard-heading">
      <div className="mb-4 flex items-center gap-2 border-b border-slate-200 pb-3 dark:border-slate-700">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
          <Trophy className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 id="leaderboard-heading" className="font-semibold text-slate-900 dark:text-slate-100">
            Leaderboard
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Live rankings</p>
        </div>
      </div>

      {showLanguageFilter && (
        <div className="mb-4">
          <span className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Language
          </span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by programming language">
            <button
              type="button"
              onClick={() => onLanguageFilterChange('')}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                languageFilter === '' ? 'bb-lb-pill-active' : 'bb-lb-pill-idle',
              )}
            >
              All
            </button>
            {supportedLanguages.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLanguageFilterChange(l)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  languageFilter === l ? 'bb-lb-pill-active' : 'bb-lb-pill-idle',
                )}
              >
                {LANG_LABEL[l] ?? l}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-14" aria-busy="true">
          <Spinner size="md" className="border-t-primary-500 text-primary-500" />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-600">
          <Trophy className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden />
          <p className="text-sm text-slate-500 dark:text-slate-400">No submissions yet — be first!</p>
        </div>
      ) : (
        <div className="-mr-1 max-h-[60vh] space-y-0 overflow-y-auto pr-1 scrollbar-thin">
          {entries.map((entry, i) => (
            <LeaderboardRow key={`${entry.userId}-${entry.rank}`} entry={entry} type={type} index={i} />
          ))}
        </div>
      )}
    </aside>
  );
}

export const LeaderboardTable = memo(LeaderboardTableComponent);
