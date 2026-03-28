import { useEffect } from 'react';
import { PageContainer } from '../../shared/components';
import { Alert } from '../../shared/components';
import { Trophy, Sparkles } from 'lucide-react';
import { useCompetitionsStore } from './useCompetitionsStore';
import {
  CompetitionCard,
  CompetitionCardSkeleton,
  CompetitionTabs,
  CompetitionEmptyState,
} from './components';

export default function Competitions() {
  const { tab, setTab, competitions, total, loading, error, fetchCompetitions } = useCompetitionsStore();

  useEffect(() => {
    fetchCompetitions();
  }, [tab, fetchCompetitions]);

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
        <p className="bb-body-text mt-8 text-center text-sm" role="status">
          Showing <strong className="text-slate-800 dark:text-slate-200">{competitions.length}</strong> of{' '}
          <strong className="text-slate-800 dark:text-slate-200">{total}</strong> contest
          {total !== 1 ? 's' : ''}
        </p>
      )}
    </PageContainer>
  );
}
