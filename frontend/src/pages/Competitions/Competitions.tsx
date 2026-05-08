import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageContainer, Button } from '../../shared/components';
import { Alert } from '../../shared/components';
import { apiClient } from '../../services/api';
import { useCompetitionsStore } from './useCompetitionsStore';
import type { RootState } from '../../store/store';
import {
  CompetitionCard,
  CompetitionCardSkeleton,
  CompetitionTabs,
  CompetitionEmptyState,
} from './components';

type ChallengeOption = {
  _id: string;
  title: string;
};

type CompetitionFormData = {
  name: string;
  description: string;
  type: 'speed' | 'code_golf' | 'algorithmic';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  challengeIds: string[];
  startTime: string;
  endTime: string;
  supportedLanguages: string[];
  prizesText: string;
};

const DEFAULT_FORM_DATA: CompetitionFormData = {
  name: '',
  description: '',
  type: 'speed',
  difficulty: 'medium',
  challengeIds: [],
  startTime: '',
  endTime: '',
  supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
  prizesText: '',
};

export default function Competitions() {
  const isAdmin = useSelector((s: RootState) => Boolean(s.auth.user?.roles?.includes('admin')));
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [availableChallenges, setAvailableChallenges] = useState<ChallengeOption[]>([]);
  const [formData, setFormData] = useState<CompetitionFormData>(DEFAULT_FORM_DATA);
  const [modalOffset, setModalOffset] = useState({ x: 0, y: 0 });
  const dragStateRef = useRef<{ active: boolean; startX: number; startY: number; originX: number; originY: number }>({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const pageSize = 6;
  const displayLanguage = (language: string) => (language === 'cpp' ? 'C++' : language);

  const getSortConfig = () =>
    sortBy === 'subs-desc'
      ? { sortBy: 'submissions' as const, sortOrder: 'desc' as const }
      : sortBy === 'start-asc'
        ? { sortBy: 'startTime' as const, sortOrder: 'asc' as const }
        : { sortBy: 'startTime' as const, sortOrder: 'desc' as const };

  const refreshCompetitions = (pageOverride = currentPage) =>
    fetchCompetitions({
      page: pageOverride,
      limit: pageSize,
      search: query.trim() || undefined,
      type: typeFilter === 'all' ? undefined : typeFilter,
      difficulty: difficultyFilter === 'all' ? undefined : difficultyFilter,
      language: languageFilter === 'all' ? undefined : languageFilter,
      ...getSortConfig(),
    });

  useEffect(() => {
    setCurrentPage(1);
  }, [tab]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      refreshCompetitions(currentPage);
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

  useEffect(() => {
    if (!showCreateModal || availableChallenges.length > 0) return;

    const loadChallenges = async () => {
      setChallengesLoading(true);
      try {
        const response = await apiClient.get('/challenges', { params: { limit: 100 } });
        setAvailableChallenges(response.data?.challenges ?? []);
      } catch {
        toast.error('Impossible de charger les challenges');
      } finally {
        setChallengesLoading(false);
      }
    };

    void loadChallenges();
  }, [showCreateModal, availableChallenges.length]);

  useEffect(() => {
    if (!showCreateModal) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowCreateModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateModal]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    typeFilter !== 'all' ||
    difficultyFilter !== 'all' ||
    languageFilter !== 'all' ||
    sortBy !== 'start-desc';

  const toggleLanguage = (language: string) => {
    setFormData((prev) => ({
      ...prev,
      supportedLanguages: prev.supportedLanguages.includes(language)
        ? prev.supportedLanguages.filter((item) => item !== language)
        : [...prev.supportedLanguages, language],
    }));
  };

  const openCreateModal = () => {
    setFormData(DEFAULT_FORM_DATA);
    setModalOffset({ x: 0, y: 0 });
    setShowCreateModal(true);
  };

  const handleDragStart = (event: React.MouseEvent<HTMLButtonElement>) => {
    dragStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: modalOffset.x,
      originY: modalOffset.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStateRef.current.active) return;

      setModalOffset({
        x: dragStateRef.current.originX + (moveEvent.clientX - dragStateRef.current.startX),
        y: dragStateRef.current.originY + (moveEvent.clientY - dragStateRef.current.startY),
      });
    };

    const handleMouseUp = () => {
      dragStateRef.current.active = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value.replace(/\s{2,}/g, ' ').slice(0, 80),
    }));
  };

  const handleDescriptionChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      description: value.slice(0, 500),
    }));
  };

  const handleCreateCompetition = async (event: React.FormEvent) => {
    event.preventDefault();

    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      toast.error('Choisis une date de debut et de fin valides');
      return;
    }

    if (startDate <= new Date()) {
      toast.error('La date de debut doit etre dans le futur');
      return;
    }

    if (endDate <= startDate) {
      toast.error('La date de fin doit etre apres la date de debut');
      return;
    }

    if (formData.challengeIds.length === 0) {
      toast.error('Selectionne au moins un challenge');
      return;
    }

    if (formData.name.trim().length < 3) {
      toast.error('Le nom doit contenir au moins 3 caracteres');
      return;
    }

    if (formData.description.trim().length < 10) {
      toast.error('La description doit contenir au moins 10 caracteres');
      return;
    }

    if (formData.supportedLanguages.length === 0) {
      toast.error('Selectionne au moins un langage');
      return;
    }

    setCreateLoading(true);
    try {
      await apiClient.post('/competitions', {
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        difficulty: formData.difficulty,
        challengeIds: formData.challengeIds,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        supportedLanguages: formData.supportedLanguages,
        prizes: formData.prizesText
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
      });

      toast.success('Competition creee avec succes');
      setShowCreateModal(false);
      setFormData(DEFAULT_FORM_DATA);
      setCurrentPage(1);
      await refreshCompetitions(1);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Creation impossible');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <PageContainer maxWidth="7xl" className="py-8 md:py-12">
      <header className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-emerald-400 mb-2">Contests</h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Compete in time-limited programming contests. Submit solutions, climb the leaderboard, and earn XP and badges.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
              Advanced competitions mode enabled
            </div>
          </div>
          {isAdmin && (
            <div className="flex gap-3">
              <Button onClick={openCreateModal}>+ Create Competition</Button>
            </div>
          )}
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
          Server query: {query.trim() || 'none'} | type: {typeFilter} | difficulty: {difficultyFilter} | language: {displayLanguage(languageFilter)} | sort: {sortBy} | page: {currentPage}
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
          {competitions.map((competition, index) => (
            <CompetitionCard key={competition._id} competition={competition} index={index} />
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
              onClick={() => setCurrentPage((value) => Math.max(1, value - 1))}
              disabled={currentPage <= 1 || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((value) => Math.min(Math.max(1, totalPages), value + 1))}
              disabled={currentPage >= Math.max(1, totalPages) || loading}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-emerald-500"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
          <div
            className="mx-auto my-6 flex max-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
            style={{ transform: `translate(${modalOffset.x}px, ${modalOffset.y}px)` }}
          >
            <div className="sticky top-0 z-10 mb-0 flex items-start justify-between gap-4 rounded-t-2xl border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Competition</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Le formulaire s&apos;ouvre directement ici.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onMouseDown={handleDragStart}
                  className="cursor-move rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:border-emerald-500 hover:text-emerald-500 dark:border-gray-600 dark:text-gray-200"
                  title="Glisser le formulaire"
                >
                  Drag
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:border-emerald-500 hover:text-emerald-500 dark:border-gray-600 dark:text-gray-200"
                >
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateCompetition} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    minLength={3}
                    maxLength={80}
                    onChange={(event) => handleNameChange(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formData.name.length}/80</p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <select
                    value={formData.type}
                    onChange={(event) => setFormData((prev) => ({ ...prev, type: event.target.value as CompetitionFormData['type'] }))}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  >
                    <option value="speed">Speed</option>
                    <option value="algorithmic">Algorithmic</option>
                    <option value="code_golf">Code Golf</option>
                  </select>
                </div>
              </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    minLength={10}
                    maxLength={500}
                    onChange={(event) => handleDescriptionChange(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formData.description.length}/500</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
                    <select
                      value={formData.difficulty}
                      onChange={(event) => setFormData((prev) => ({ ...prev, difficulty: event.target.value as CompetitionFormData['difficulty'] }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="expert">Expert</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Challenges</label>
                    <select
                      multiple
                      required
                      value={formData.challengeIds}
                      onChange={(event) =>
                        setFormData((prev) => ({
                          ...prev,
                          challengeIds: Array.from(event.target.selectedOptions, (option) => option.value),
                        }))
                      }
                      className="h-32 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    >
                      {availableChallenges.map((challenge) => (
                        <option key={challenge._id} value={challenge._id}>
                          {challenge.title}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {challengesLoading ? 'Chargement des challenges...' : 'Maintiens Ctrl/Cmd pour selectionner plusieurs challenges.'}
                    </p>
                    {formData.challengeIds.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {formData.challengeIds.map((challengeId) => {
                          const selectedChallenge = availableChallenges.find((challenge) => challenge._id === challengeId);
                          return (
                            <span
                              key={challengeId}
                              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                            >
                              <span>{selectedChallenge?.title || challengeId}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    challengeIds: prev.challengeIds.filter((id) => id !== challengeId),
                                  }))
                                }
                                className="text-emerald-200 transition hover:text-white"
                                aria-label={`Retirer ${selectedChallenge?.title || challengeId}`}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
                    <input
                      type="datetime-local"
                      required
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      value={formData.startTime}
                      onChange={(event) => setFormData((prev) => ({ ...prev, startTime: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
                    <input
                      type="datetime-local"
                      required
                      min={formData.startTime || new Date(Date.now() + 120000).toISOString().slice(0, 16)}
                      value={formData.endTime}
                      onChange={(event) => setFormData((prev) => ({ ...prev, endTime: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Supported Languages</label>
                  <div className="flex flex-wrap gap-3">
                    {['javascript', 'python', 'java', 'cpp'].map((language) => (
                      <label
                        key={language}
                        className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-3 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
                      >
                        <input
                          type="checkbox"
                          checked={formData.supportedLanguages.includes(language)}
                          onChange={() => toggleLanguage(language)}
                        />
                        <span>{language === 'cpp' ? 'C++' : language.charAt(0).toUpperCase() + language.slice(1)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Prizes</label>
                  <textarea
                    rows={3}
                    value={formData.prizesText}
                    onChange={(event) => setFormData((prev) => ({ ...prev, prizesText: event.target.value }))}
                    placeholder={'1st place badge\n500 DT prize pool'}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-emerald-500 hover:text-emerald-500 dark:border-gray-600 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading || challengesLoading}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createLoading ? 'Creating...' : 'Create Competition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
