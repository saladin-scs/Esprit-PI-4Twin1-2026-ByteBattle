import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { PageContainer } from '../../shared/components';
import { Alert } from '../../shared/components';
import { useCompetitionsStore } from './useCompetitionsStore';
import {
  CompetitionCard,
  CompetitionCardSkeleton,
  CompetitionTabs,
  CompetitionEmptyState,
} from './components';

export default function Competitions() {
  const {
    tab,
    setTab,
    competitions,
    total,
    page,
    totalPages,
    loading,
    error,
    fetchCompetitions,
  } = useCompetitionsStore();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'speed' | 'code_golf' | 'algorithmic'>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard' | 'expert'>('all');
  const [languageFilter, setLanguageFilter] = useState<'all' | 'javascript' | 'python' | 'java' | 'cpp'>('all');
  const [sortBy, setSortBy] = useState<'start-desc' | 'start-asc' | 'subs-desc'>('start-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const sortConfig =
        sortBy === 'subs-desc'
          ? { sortBy: 'submissions' as const, sortOrder: 'desc' as const }
          : sortBy === 'start-asc'
            ? { sortBy: 'startTime' as const, sortOrder: 'asc' as const }
            : { sortBy: 'startTime' as const, sortOrder: 'desc' as const };

      fetchCompetitions({
        page: currentPage,
        limit: pageSize,
        search: query.trim() || undefined,
        type: typeFilter === 'all' ? undefined : typeFilter,
        difficulty: difficultyFilter === 'all' ? undefined : difficultyFilter,
        language: languageFilter === 'all' ? undefined : languageFilter,
        ...sortConfig,
      });
    }, 250);

    return () => clearTimeout(timeout);
  }, [
    tab,
    query,
    typeFilter,
    difficultyFilter,
    languageFilter,
    sortBy,
    currentPage,
    fetchCompetitions,
  ]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    typeFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    languageFilter !== 'all' ||
    sortBy !== 'start-desc';

  return (
    <PageContainer maxWidth="7xl" className="py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">Contests</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Compete in time-limited programming contests. Submit solutions, climb the leaderboard, and earn XP and badges.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
          Advanced competitions mode enabled
        </div>
      </header>

      <CompetitionTabs activeTab={tab} onTabChange={setTab} disabled={loading} />

      <section className="mt-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/40 p-4 sm:p-5">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2 relative">
            <label htmlFor="contest-search" className="sr-only">Search contests</label>
            <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden />
            <input
              id="contest-search"
              value={query}
              onChange={(e) => {
                setCurrentPage(1);
                setQuery(e.target.value);
              }}
              placeholder="Search by title or description"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setTypeFilter(e.target.value as typeof typeFilter);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Filter by contest type"
          >
            <option value="all">All types</option>
            <option value="speed">Speed</option>
            <option value="algorithmic">Algorithmic</option>
            <option value="code_golf">Code Golf</option>
          </select>

          <select
            value={difficultyFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setDifficultyFilter(e.target.value as typeof difficultyFilter);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Filter by difficulty"
          >
            <option value="all">All difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
            <option value="expert">Expert</option>
          </select>

          <select
            value={languageFilter}
            onChange={(e) => {
              setCurrentPage(1);
              setLanguageFilter(e.target.value as typeof languageFilter);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Filter by language"
          >
            <option value="all">All languages</option>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <select
            value={sortBy}
            onChange={(e) => {
              setCurrentPage(1);
              setSortBy(e.target.value as typeof sortBy);
            }}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900/80 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:w-64"
            aria-label="Sort competitions"
          >
            <option value="start-desc">Sort: newest start date</option>
            <option value="start-asc">Sort: oldest start date</option>
            <option value="subs-desc">Sort: most submissions</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setCurrentPage(1);
                setQuery('');
                setTypeFilter('all');
                setDifficultyFilter('all');
                setLanguageFilter('all');
                setSortBy('start-desc');
              }}
              className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Server query: {query.trim() || 'none'} | type: {typeFilter} | difficulty: {difficultyFilter} | language: {languageFilter} | sort: {sortBy} | page: {currentPage}
        </div>
      </section>

      <div id="panel-active" role="tabpanel" aria-labelledby="tab-active" className="mt-6">
        {tab === 'scheduled' && <div id="panel-scheduled" role="tabpanel" aria-labelledby="tab-scheduled" />}
        {tab === 'past' && <div id="panel-past" role="tabpanel" aria-labelledby="tab-past" />}
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading contests">
          {[1, 2, 3].map((i) => (
            <CompetitionCardSkeleton key={i} />
          ))}
        </div>
      ) : competitions.length === 0 ? (
        <CompetitionEmptyState tab={tab} className="mt-6" />
      ) : (
        <div className="mt-6 space-y-4">
          {competitions.map((c, i) => (
            <CompetitionCard key={c._id} competition={c} index={i} />
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-500 dark:text-gray-400" role="status">
            Showing {competitions.length} of {total} contest{total !== 1 ? 's' : ''} · page {page} / {Math.max(1, totalPages)}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(Math.max(1, totalPages), p + 1))}
              disabled={currentPage >= Math.max(1, totalPages) || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
