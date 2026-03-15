import { memo } from 'react';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '../types';
import type { CompetitionType } from '../types';
import { LeaderboardRow } from './LeaderboardRow';
import { Spinner } from '../../../shared/components';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  type: CompetitionType;
  loading?: boolean;
  languageFilter: string;
  onLanguageFilterChange: (lang: string) => void;
  supportedLanguages: string[];
  className?: string;
}

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
    <aside
      className={`bg-gray-800/50 border border-gray-700 rounded-xl p-5 sticky top-4 ${className}`}
      aria-labelledby="leaderboard-heading"
    >
      <div className="flex items-center gap-2 mb-3 text-emerald-400">
        <Trophy className="w-5 h-5" aria-hidden />
        <h2 id="leaderboard-heading" className="font-semibold">
          Leaderboard
        </h2>
      </div>
      {showLanguageFilter && (
        <div className="mb-3">
          <label htmlFor="leaderboard-lang" className="text-xs text-gray-500 block mb-1">
            Filter by language
          </label>
          <select
            id="leaderboard-lang"
            value={languageFilter}
            onChange={(e) => onLanguageFilterChange(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 text-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow"
            aria-label="Filter leaderboard by language"
          >
            <option value="">All</option>
            {supportedLanguages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      )}
      {loading ? (
        <div className="flex justify-center py-12" aria-busy="true">
          <Spinner size="md" className="text-emerald-500 border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No submissions yet.</p>
      ) : (
        <div className="space-y-0 max-h-[60vh] overflow-y-auto pr-1 -mr-1 scrollbar-thin">
          {entries.map((entry, i) => (
            <LeaderboardRow key={`${entry.userId}-${entry.rank}`} entry={entry} type={type} index={i} />
          ))}
        </div>
      )}
    </aside>
  );
}

export const LeaderboardTable = memo(LeaderboardTableComponent);
