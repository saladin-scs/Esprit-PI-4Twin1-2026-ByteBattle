import { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '../../shared/components';
import { Alert } from '../../shared/components';
import { ChatAvailabilityCallout } from '../../shared/components/ChatAvailabilityCallout';
import { Trophy, Sparkles, Filter } from 'lucide-react';
import { useCompetitionsStore } from './useCompetitionsStore';
import {
  CompetitionCard,
  CompetitionCardSkeleton,
  CompetitionTabs,
  CompetitionEmptyState,
} from './components';
import type { CompetitionType } from './types';

export default function Competitions() {
  const { tab, setTab, competitions, total, loading, error, fetchCompetitions } = useCompetitionsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'' | CompetitionType>('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchCompetitions();
  }, [tab, fetchCompetitions]);

  const languageOptions = useMemo(() => {
    const set = new Set<string>();
    competitions.forEach((c) => (c.supportedLanguages || []).forEach((l) => set.add(String(l))));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [competitions]);

  const filteredCompetitions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return competitions.filter((c) => {
      if (typeFilter && c.type !== typeFilter) return false;
      if (languageFilter && !(c.supportedLanguages || []).includes(languageFilter)) return false;
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    });
  }, [competitions, searchQuery, typeFilter, languageFilter]);

  const resetFilters = () => {
    setSearchQuery('');
    setTypeFilter('');
    setLanguageFilter('');
  };

  return (
    <PageContainer maxWidth="7xl" className="relative py-8 md:py-12">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <header className="relative mb-10">
        <div className="bb-kicker">
          <Trophy className="h-3.5 w-3.5" aria-hidden />
          Contests
        </div>
        <h1 className="bb-page-heading mb-3 flex flex-wrap items-center gap-2">
          <Sparkles className="h-8 w-8 shrink-0 text-amber-500" aria-hidden />
          <span className="bb-title-gradient text-3xl md:text-4xl">ByteBattle contests</span>
        </h1>
        <p className="bb-body-text max-w-2xl">
          Time-limited programming contests. Submit solutions, climb live leaderboards, earn XP and badges.
        </p>
      </header>

      <div className="relative mb-8">
        <ChatAvailabilityCallout variant="banner" />
      </div>

      <CompetitionTabs activeTab={tab} onTabChange={setTab} disabled={loading} />

      <div id="panel-active" role="tabpanel" aria-labelledby="tab-active" className="mt-6">
        {tab === 'scheduled' && <div id="panel-scheduled" role="tabpanel" aria-labelledby="tab-scheduled" />}
        {tab === 'past' && <div id="panel-past" role="tabpanel" aria-labelledby="tab-past" />}
      </div>

      {error && (
        <Alert variant="error" className="mt-6">
          {error}
        </Alert>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Search</label>
              <input
                type="text"
                placeholder="Name or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as '' | CompetitionType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="">All types</option>
                <option value="algorithmic">Algorithmic</option>
                <option value="speed">Speed</option>
                <option value="code_golf">Code Golf</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Language</label>
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="">All languages</option>
                {languageOptions.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-4">
              <button
                onClick={resetFilters}
                className="w-full rounded-lg bg-slate-300 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-400 dark:bg-slate-600 dark:text-white dark:hover:bg-slate-500"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading contests">
          {[1, 2, 3].map((i) => (
            <CompetitionCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCompetitions.length === 0 ? (
        <CompetitionEmptyState tab={tab} className="mt-6" />
      ) : (
        <div className="mt-6 space-y-4">
          {filteredCompetitions.map((c, i) => (
            <CompetitionCard key={c._id} competition={c} index={i} />
          ))}
        </div>
      )}

      {!loading && total > 0 && (
        <p className="bb-body-text mt-8 text-center text-sm" role="status">
          Showing <strong className="text-slate-800 dark:text-slate-200">{filteredCompetitions.length}</strong> of{' '}
          <strong className="text-slate-800 dark:text-slate-200">{total}</strong> contest
          {total !== 1 ? 's' : ''}
        </p>
      )}
    </PageContainer>
  );
}
