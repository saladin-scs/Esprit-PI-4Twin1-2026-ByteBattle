import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { ByteBattleLogo } from '../../components/ByteBattleLogo';
import { PageContainer, Card, Button, Spinner } from '../../shared/components';
import { Trophy, Zap, BarChart3, MessageCircle } from 'lucide-react';
import RecommendationSection from '../../components/Recommendations/RecommendationSection';
import { challengesApi, competitionsApi, type RecommendedChallengeItem } from '../../services/api';

type ContestSummary = {
  id: string;
  title: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
};

function normalizeApiItems<T>(payload: unknown): T[] {
  if (!payload || typeof payload !== 'object') return [];
  const body = payload as Record<string, unknown>;
  if (Array.isArray(body.data)) return body.data as T[];
  if (Array.isArray(body.items)) return body.items as T[];
  const nestedData = body.data as Record<string, unknown> | undefined;
  if (nestedData && Array.isArray(nestedData.items)) return nestedData.items as T[];
  if (Array.isArray(body.challenges)) return body.challenges as T[];
  if (Array.isArray(body.contests)) return body.contests as T[];
  return [];
}

function Home() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [featuredChallenges, setFeaturedChallenges] = useState<RecommendedChallengeItem[]>([]);
  const [recentContests, setRecentContests] = useState<ContestSummary[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingContests, setLoadingContests] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  const [recentError, setRecentError] = useState<string | null>(null);

  useEffect(() => {
    const loadFeatured = async () => {
      setLoadingFeatured(true);
      setFeaturedError(null);
      try {
        const response = await challengesApi.getRecommended({ limit: 6 });
        const items = normalizeApiItems<RecommendedChallengeItem>(response.data);
        setFeaturedChallenges(items);
      } catch (error) {
        setFeaturedError('Unable to load featured challenges.');
      } finally {
        setLoadingFeatured(false);
      }
    };

    const loadRecentContests = async () => {
      setLoadingContests(true);
      setRecentError(null);
      try {
        const response = await competitionsApi.getAll({ limit: 4 });
        const items = normalizeApiItems<ContestSummary>(response.data);
        setRecentContests(items);
      } catch (error) {
        setRecentError('Unable to load recent contests.');
      } finally {
        setLoadingContests(false);
      }
    };

    loadFeatured();
    loadRecentContests();
  }, []);

  const displayedFeatured = Array.isArray(featuredChallenges) ? featuredChallenges.slice(0, 3) : [];
  const displayedContests = Array.isArray(recentContests) ? recentContests.slice(0, 3) : [];

  return (
    <PageContainer maxWidth="7xl" className="relative py-12 md:py-16">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <div className="relative text-center">
        <div className="bb-kicker mx-auto mb-4 w-fit">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          ByteBattle
        </div>
        <h1 className="mb-6 flex justify-center">
          <ByteBattleLogo className="h-24 w-auto origin-center sm:h-28 md:h-32" />
        </h1>
        <p className="bb-body-text mx-auto mb-4 max-w-2xl text-lg md:text-xl">
          Real-time coding challenges and contests. Compete, learn, and level up with AI-assisted practice.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {isAuthenticated ? (
            <>
              <Link to="/challenges">
                <Button className="!px-8 !py-3 text-lg">Start coding</Button>
              </Link>
              <Link to="/competitions">
                <Button variant="secondary" className="!px-8 !py-3 text-lg">
                  Join a contest
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link to="/register">
                <Button className="!px-8 !py-3 text-lg">Create an account</Button>
              </Link>
              <Link to="/challenges">
                <Button variant="secondary" className="!px-8 !py-3 text-lg">
                  Browse challenges
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="bb-card p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Featured challenges</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Pick up a challenge</h2>
            </div>
            <Link to="/challenges" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="py-8 flex justify-center">
              <Spinner />
            </div>
          ) : featuredError ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {featuredError}
            </div>
          ) : Array.isArray(featuredChallenges) && featuredChallenges.length > 0 ? (
            <div className="space-y-4">
              {displayedFeatured.map((challenge) => (
                <Link
                  key={challenge.id}
                  to={`/challenges/${challenge.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary-400 hover:bg-primary-50 dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-primary-500"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {challenge.title}
                    </h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {challenge.difficulty}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {Array.isArray(challenge.tags) ? challenge.tags.slice(0, 3).join(', ') : 'No tags available.'}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              No featured challenges available right now.
            </div>
          )}
        </Card>

        <Card className="bb-card p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Recent contests</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Join the next battle</h2>
            </div>
            <Link to="/competitions" className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">
              View all
            </Link>
          </div>

          {loadingContests ? (
            <div className="py-8 flex justify-center">
              <Spinner />
            </div>
          ) : recentError ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
              {recentError}
            </div>
          ) : Array.isArray(recentContests) && recentContests.length > 0 ? (
            <div className="space-y-4">
              {displayedContests.map((contest) => (
                <div key={contest.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/60">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{contest.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                    {contest.status ? `${contest.status} contest` : 'Contest details loading...'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-6 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              No recent contests available right now.
            </div>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <RecommendationSection context="home" limit={4} />
      </div>

      <div className="relative mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 md:gap-8">
        <Card className="bb-card border-0 p-6 shadow-lg">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <Trophy className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="bb-section-title mb-2 text-base">Contests</h2>
          <p className="bb-body-text text-sm">
            Time-limited contests, live leaderboards, and multi-problem battles — same flow as our contest hub.
          </p>
        </Card>
        <Card className="bb-card border-0 p-6 shadow-lg">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <Zap className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="bb-section-title mb-2 text-base">Challenges</h2>
          <p className="bb-body-text text-sm">
            Practice in multiple languages, run against hidden tests, and earn XP on every solve.
          </p>
        </Card>
        <Card className="bb-card border-0 p-6 shadow-lg">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400">
            <BarChart3 className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="bb-section-title mb-2 text-base">Progress</h2>
          <p className="bb-body-text text-sm">
            Tiers, streaks, badges, and global leaderboard — track growth in one place.
          </p>
        </Card>
        <Card className="bb-card border-0 p-6 shadow-lg ring-2 ring-emerald-500/20">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="bb-section-title mb-2 text-base">Live chat</h2>
          <p className="bb-body-text text-sm">
            {isAuthenticated
              ? 'Discuss with others on each challenge (Chat tab) and in every contest (sidebar under the leaderboard).'
              : 'Sign in to join challenge and contest chat rooms in real time.'}
          </p>
        </Card>
      </div>
    </PageContainer>
  );
}

export default Home;
