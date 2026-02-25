import { useEffect, useState, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { fetchChallenges } from '../../store/slices/challengesSlice';
import { AppDispatch, RootState } from '../../store/store';
import type { Challenge } from '../../types/challenge';
import { PageContainer, Input, Button, Card, Spinner } from '../../shared/components';

type DifficultyFilter = 'all' | 'easy' | 'medium' | 'hard';
type SortOption = 'default' | 'difficulty' | 'popular' | 'newest';

function Challenges() {
  const dispatch = useDispatch<AppDispatch>();
  const { challenges, loading } = useSelector(
    (state: RootState) => state.challenges
  );
  const [search, setSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('default');

  useEffect(() => {
    dispatch(fetchChallenges());
  }, [dispatch]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => c.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [challenges]);

  const filteredAndSorted = useMemo(() => {
    let list = [...challenges];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (difficultyFilter !== 'all') {
      list = list.filter((c) => (c.difficulty ?? 'medium') === difficultyFilter);
    }

    if (tagFilter) {
      list = list.filter((c) => c.tags?.includes(tagFilter));
    }

    if (sortBy === 'difficulty') {
      const order = { easy: 0, medium: 1, hard: 2 };
      list.sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1));
    } else if (sortBy === 'popular') {
      list.sort((a, b) => (b.solvedCount ?? 0) - (a.solvedCount ?? 0));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => (b._id ?? '').localeCompare(a._id ?? ''));
    }

    return list;
  }, [challenges, search, difficultyFilter, tagFilter, sortBy]);

  const getDifficultyClass = (c: Challenge) => {
    const d = c.difficulty ?? 'medium';
    if (d === 'easy') return 'bg-green-600/20 text-green-400 border border-green-500/50';
    if (d === 'hard') return 'bg-red-600/20 text-red-400 border border-red-500/50';
    return 'bg-amber-600/20 text-amber-400 border border-amber-500/50';
  };

  if (loading) {
    return (
      <PageContainer maxWidth="7xl" className="py-12">
        <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
          <Spinner size="md" />
          <span>Chargement des défis…</span>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Défis</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Entraînez-vous avec validation automatique et retours de l’IA
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <Input
          type="search"
          placeholder="Rechercher des défis…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0"
        />
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as DifficultyFilter)}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none"
        >
          <option value="all">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none"
        >
          <option value="">All tags</option>
          {allTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:border-blue-500 outline-none"
        >
          <option value="default">Default</option>
          <option value="difficulty">Easy → Hard</option>
          <option value="popular">Most solved</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      {filteredAndSorted.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-lg">Aucun défi ne correspond à vos filtres</p>
            <Button
              className="mt-4"
              onClick={() => {
                setSearch('');
                setDifficultyFilter('all');
                setTagFilter('');
                setSortBy('default');
              }}
            >
              Réinitialiser les filtres
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map((challenge) => (
            <Link
              key={challenge._id}
              to={`/challenges/${challenge._id}`}
              className="group block bg-white dark:bg-gray-800 p-6 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/80 transition border border-gray-200 dark:border-gray-700/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition line-clamp-1">
                  {challenge.title}
                </h3>
                <span
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyClass(challenge)}`}
                >
                  {challenge.difficulty ?? 'medium'}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 line-clamp-2 leading-relaxed">
                {challenge.description}
              </p>
              {challenge.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {challenge.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-400 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700/50">
                <span>
                  {challenge.solvedCount ?? 0} résolus
                  {(challenge.attemptCount ?? 0) > 0 && (
                    <> · {(challenge.attemptCount ?? 0)} tentatives</>
                  )}
                </span>
                <span className="text-blue-600 dark:text-blue-400 group-hover:text-blue-500 text-xs font-medium">
                  Démarrer →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default Challenges;

