import { useEffect } from 'react';
import { PageContainer } from '../../shared/components';
import { Alert, Spinner } from '../../shared/components';
import { useCompetitionsStore } from './useCompetitionsStore';
import type { CompetitionTab } from './types';
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
    <PageContainer maxWidth="7xl" className="py-8 md:py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-emerald-400 mb-2">Contests</h1>
        <p className="text-gray-400 max-w-2xl">
          Compete in time-limited programming contests. Submit solutions, climb the leaderboard, and earn XP and badges.
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
        <p className="mt-6 text-sm text-gray-500" role="status">
          Showing {competitions.length} of {total} contest{total !== 1 ? 's' : ''}
        </p>
      )}
    </PageContainer>
  );
}
