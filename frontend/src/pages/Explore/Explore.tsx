import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Trophy, Code2, User } from 'lucide-react';
import { PageContainer, Input, Card, Spinner } from '../../shared/components';
import { exploreApi, type ExploreSearchResult } from '../../services/api';
import { DifficultyBadge } from '../../components/Challenges';

function useDebounced<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setD(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return d;
}

export default function Explore() {
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 320);
  const [data, setData] = useState<ExploreSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = debounced.trim();
    if (!term) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    exploreApi
      .search({ q: term, limit: 10 })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setData({ query: term, challenges: [], competitions: [], users: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <PageContainer maxWidth="4xl" className="py-10 md:py-14">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Search className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold uppercase tracking-wide">Explore</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Unified search</h1>
        <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
          Challenges, competitions, and public profiles in one search bar.
        </p>
      </div>

      <Card className="mb-8 p-4">
        <label className="sr-only" htmlFor="explore-q">
          Search
        </label>
        <Input
          id="explore-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, tag, competition, username..."
          className="w-full"
        />
      </Card>

      {loading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {!loading && !debounced.trim() && (
        <p className="text-center text-slate-500 dark:text-slate-400">Enter a term to start searching.</p>
      )}

      {!loading && debounced.trim() && data && (
        <div className="grid gap-8 md:grid-cols-3">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Code2 className="h-5 w-5 text-primary-500" aria-hidden />
              Challenges ({data.challenges.length})
            </h2>
            <ul className="space-y-2">
              {data.challenges.length === 0 ? (
                <li className="text-sm text-slate-500">No results</li>
              ) : (
                data.challenges.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/challenges/${c.id}`}
                      className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-primary-400 dark:border-slate-700 dark:bg-slate-900/50 dark:hover:border-primary-500"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{c.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <DifficultyBadge difficulty={c.difficulty} size="sm" />
                        {c.xpReward != null && (
                          <span className="text-xs text-amber-600 dark:text-amber-400">+{c.xpReward} XP</span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
              Competitions ({data.competitions.length})
            </h2>
            <ul className="space-y-2">
              {data.competitions.length === 0 ? (
                <li className="text-sm text-slate-500">No results</li>
              ) : (
                data.competitions.map((c) => (
                  <li key={c.id}>
                    <Link
                      to={`/competitions/${c.id}`}
                      className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-amber-400 dark:border-slate-700 dark:bg-slate-900/50"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{c.status}</div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <User className="h-5 w-5 text-slate-500" aria-hidden />
              Users ({data.users.length})
            </h2>
            <ul className="space-y-2">
              {data.users.length === 0 ? (
                <li className="text-sm text-slate-500">No results</li>
              ) : (
                data.users.map((u) => (
                  <li key={u.id}>
                    <Link
                      to={`/u/${u.username}`}
                      className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50"
                    >
                      <div className="font-medium text-slate-900 dark:text-white">@{u.username}</div>
                      {u.displayName && <div className="text-xs text-slate-500">{u.displayName}</div>}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}
    </PageContainer>
  );
}
