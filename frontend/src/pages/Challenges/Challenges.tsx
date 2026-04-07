import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { DifficultyBadge, ChallengeFilters } from '../../components/Challenges';
import { useChallengesStore, type ChallengeListItem } from '../../stores/challengesStore';
import { ChevronLeft, ChevronRight, Code2, Sparkles } from 'lucide-react';
import { PageContainer, Spinner, Button } from '../../shared/components';
import { ChatAvailabilityCallout } from '../../shared/components';
import { challengesApi, type RecommendedChallengeItem } from '../../services/api';
import { RootState } from '../../store/store';

const PAGE_SIZE = 15;

/** Days aligned with backend CHALLENGE_NEW_DAYS default (14). */
const NEW_CHALLENGE_DAYS = 14;

function isNewFromCreatedAt(createdAt?: string): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t < NEW_CHALLENGE_DAYS * 86400000;
}

const Challenges = () => {
  const navigate = useNavigate();
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const isAdmin = useSelector((s: RootState) => Boolean(s.auth.user?.roles?.includes('admin')));
  const [reco, setReco] = useState<RecommendedChallengeItem[]>([]);
  const [recoLoading, setRecoLoading] = useState(false);

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

  useEffect(() => {
    if (!isAuthenticated) {
      setReco([]);
      return;
    }
    let cancelled = false;
    setRecoLoading(true);
    challengesApi
      .getRecommended({ limit: 8 })
      .then((res) => {
        if (!cancelled) setReco(res.data.challenges || []);
      })
      .catch(() => {
        if (!cancelled) setReco([]);
      })
      .finally(() => {
        if (!cancelled) setRecoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchChallenges();
  };

  const acceptanceRate = (c: ChallengeListItem) =>
    c.totalSubmissions > 0 ? Math.round((c.totalAccepted / c.totalSubmissions) * 100) : 0;

  return (
    <PageContainer maxWidth="7xl" className="relative py-8 md:py-12">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <header className="relative mb-8">
        <div className="bb-kicker">
          <Code2 className="h-3.5 w-3.5" aria-hidden />
          Practice
        </div>
        <h1 className="bb-page-heading mb-2 flex flex-wrap items-center gap-2">
          <Sparkles className="h-8 w-8 shrink-0 text-amber-500" aria-hidden />
          <span className="bb-title-gradient text-3xl md:text-4xl">Challenges</span>
        </h1>
<p className="bb-body-text max-w-2xl" aria-live="polite" aria-atomic="true">
          {total} challenge{total !== 1 ? 's' : ''} available — <strong>newest first</strong>. Challenges from the last{' '}
          {NEW_CHALLENGE_DAYS} days are marked <span className="font-medium text-emerald-600 dark:text-emerald-400">New</span>.
        </p>
        {isAdmin && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => navigate('/admin/challenges')}>+ Create Challenge</Button>
          </div>
        )}
      </header>

      <div className="relative mb-6">
        <ChatAvailabilityCallout variant="compact" />
      </div>

      {isAuthenticated && (
        <section  className="relative mb-8 bb-card p-4 sm:p-5" aria-label="Recommended challenges">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
            Recommended for you
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Basic suggestions based on your most recently solved challenges (tags and difficulty).
          </p>
          {recoLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : reco.length === 0 ? (
            <p className="text-sm text-slate-500">Solve a challenge to improve recommendations.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {reco.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/challenges/${c.id}`)}
                  className="min-w-[200px] max-w-[240px] shrink-0 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-primary-400 dark:border-slate-600 dark:bg-slate-900/40 dark:hover:border-primary-500"
                >
                  <div className="line-clamp-2 font-medium text-slate-900 dark:text-white">{c.title}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DifficultyBadge difficulty={c.difficulty} size="sm" />
                    {c.xpReward != null && (
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">+{c.xpReward} XP</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="relative mb-6 bb-card p-4 sm:p-5">
        <ChallengeFilters
          search={filters.search}
          onSearchChange={(v) => setFilters({ search: v })}
          difficulty={filters.difficulty}
          onDifficultyChange={(v) => {
            setFilters({ difficulty: v });
            setPage(1);
          }}
          language={filters.language}
          onLanguageChange={(v) => {
            setFilters({ language: v });
            setPage(1);
          }}
          onSearch={handleSearch}
          placeholder="Search challenges..."
        />
      </div>

      {error && (
        <div className="relative mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="relative bb-card overflow-hidden p-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500 dark:text-slate-400">
            <Spinner size="lg" />
            <span className="text-sm">Loading challenges…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Languages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Acceptance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    XP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {challenges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="bb-body-text px-4 py-14 text-center text-sm">
                      No challenges found
                    </td>
                  </tr>
                ) : (
                  challenges.map((c, i) => (
                   <tr
  key={c._id}
  onClick={() => navigate(`/challenges/${c._id}`)}
  tabIndex={0}
  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/challenges/${c._id}`); }}
  onFocus={(e) => (e.currentTarget.style.outline = '2px solid #6366f1')}
  onBlur={(e) => (e.currentTarget.style.outline = '')}
  className="cursor-pointer transition-colors hover:bg-primary-500/5 dark:hover:bg-primary-500/10"
>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">{c.title}</span>
                          {(c.isNew || isNewFromCreatedAt(c.createdAt)) && (
                            <span
                              className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:border-emerald-400/35 dark:bg-emerald-500/20 dark:text-emerald-200"
                              title={`New - created less than ${NEW_CHALLENGE_DAYS} days ago`}
                            >
                              New
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(c.tags || []).slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <DifficultyBadge difficulty={c.difficulty} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(c.languages || []).slice(0, 3).map((l) => (
                            <span
                              key={l}
                              className="inline-flex rounded-md border border-primary-500/25 bg-primary-500/10 px-2 py-0.5 text-xs font-medium text-primary-800 dark:text-primary-300"
                            >
                              {l}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-semibold ${
                            acceptanceRate(c) >= 50
                              ? 'text-primary-600 dark:text-primary-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {acceptanceRate(c)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-amber-600 dark:text-amber-400">
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
        <nav aria-label="Challenge pages navigation" className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page === 1}
            onClick={() => setPage(Math.max(1, page - 1))}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="bb-body-text px-4 text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page === totalPages}
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            className="inline-flex items-center gap-1 px-3 py-2 text-sm"
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </PageContainer>
  );
};

export default Challenges;
