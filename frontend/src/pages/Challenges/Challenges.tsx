import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DifficultyBadge, ChallengeFilters } from '../../components/Challenges';
import { useChallengesStore, type ChallengeListItem } from '../../stores/challengesStore';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 15;

const Challenges = () => {
  const navigate = useNavigate();
  const {
    challenges,
    total,
    totalPages,
    page,
    loading,
    error,
    filters,
    setFilters,
    setPage,
    fetchChallenges,
  } = useChallengesStore();

  useEffect(() => {
    fetchChallenges();
  }, [filters.difficulty, filters.language, filters.search, page, fetchChallenges]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchChallenges();
  };

  const acceptanceRate = (c: ChallengeListItem) =>
    c.totalSubmissions > 0 ? Math.round((c.totalAccepted / c.totalSubmissions) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Challenges
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {total} challenge{total !== 1 ? 's' : ''} available
        </p>
      </div>

      <div className="mb-6">
        <ChallengeFilters
          search={filters.search}
          onSearchChange={(v) => setFilters({ search: v })}
          difficulty={filters.difficulty}
          onDifficultyChange={(v) => { setFilters({ difficulty: v }); setPage(1); }}
          language={filters.language}
          onLanguageChange={(v) => { setFilters({ language: v }); setPage(1); }}
          onSearch={handleSearch}
          placeholder="Search challenges..."
        />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Difficulty</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Languages</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acceptance</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {challenges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No challenges found
                    </td>
                  </tr>
                ) : (
                  challenges.map((c, i) => (
                    <tr
                      key={c._id}
                      onClick={() => navigate(`/challenges/${c._id}`)}
                      className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900 dark:text-white">{c.title}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(c.tags || []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-flex px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <DifficultyBadge difficulty={c.difficulty} size="sm" />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(c.languages || []).slice(0, 2).map((l) => (
                            <span
                              key={l}
                              className="inline-flex px-2 py-0.5 rounded text-xs bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-700 dark:text-indigo-300"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-sm font-medium ${
                            acceptanceRate(c) >= 50
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {acceptanceRate(c)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-amber-600 dark:text-amber-400">
                        +{c.xpReward} XP
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            type="button"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Challenges;
