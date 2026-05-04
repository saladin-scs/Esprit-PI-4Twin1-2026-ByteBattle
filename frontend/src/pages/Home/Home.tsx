import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { ByteBattleLogo } from '../../components/ByteBattleLogo';
import { PageContainer, Card, Button } from '../../shared/components';
import { Trophy, Zap, BarChart3, MessageCircle, Code2, Clock, ChevronRight } from 'lucide-react';
import { challengesApi, competitionsApi } from '../../services/api';

type HomeChallenge = {
  _id: string;
  title: string;
  difficulty: string;
  xpReward?: number;
  isNew?: boolean;
};

type HomeCompetition = {
  _id: string;
  name: string;
  status: string;
  type?: string;
  startTime?: string;
};

function Home() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [featuredChallenges, setFeaturedChallenges] = useState<HomeChallenge[]>([]);
  const [featuredCompetitions, setFeaturedCompetitions] = useState<HomeCompetition[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadFeatured = async () => {
      setLoadingFeatured(true);
      try {
        const [challengeRes, competitionRes] = await Promise.all([
          challengesApi.getAll({ limit: 3 }),
          competitionsApi.getAll({ limit: 3 }),
        ]);

        if (cancelled) return;

        setFeaturedChallenges((challengeRes.data?.challenges ?? []) as HomeChallenge[]);
        setFeaturedCompetitions((competitionRes.data?.competitions ?? []) as HomeCompetition[]);
      } catch {
        if (!cancelled) {
          setFeaturedChallenges([]);
          setFeaturedCompetitions([]);
        }
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    };

    void loadFeatured();

    return () => {
      cancelled = true;
    };
  }, []);

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

      <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 md:gap-8">
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

      <div className="relative mt-16 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="bb-card border-0 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="bb-kicker mb-2 w-fit">
                <Code2 className="h-3.5 w-3.5" aria-hidden />
                Featured
              </div>
              <h2 className="bb-section-title text-xl">Challenges</h2>
            </div>
            <Link
              to="/challenges"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              View all <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {loadingFeatured ? (
            <p className="bb-body-text text-sm">Loading challenges...</p>
          ) : featuredChallenges.length === 0 ? (
            <p className="bb-body-text text-sm">No challenges available yet.</p>
          ) : (
            <div className="space-y-3">
              {featuredChallenges.map((challenge) => (
                <Link
                  key={challenge._id}
                  to={`/challenges/${challenge._id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary-400 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-primary-500"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{challenge.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize dark:bg-slate-800">{challenge.difficulty}</span>
                      {challenge.xpReward != null && <span>+{challenge.xpReward} XP</span>}
                      {challenge.isNew && <span className="text-emerald-500">New</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="bb-card border-0 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="bb-kicker mb-2 w-fit">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                Live
              </div>
              <h2 className="bb-section-title text-xl">Competitions</h2>
            </div>
            <Link
              to="/competitions"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
            >
              View all <ChevronRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          {loadingFeatured ? (
            <p className="bb-body-text text-sm">Loading competitions...</p>
          ) : featuredCompetitions.length === 0 ? (
            <p className="bb-body-text text-sm">No competitions available yet.</p>
          ) : (
            <div className="space-y-3">
              {featuredCompetitions.map((competition) => (
                <Link
                  key={competition._id}
                  to={`/competitions/${competition._id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-primary-400 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-primary-500"
                >
                  <div>
                    <div className="font-medium text-slate-900 dark:text-white">{competition.name}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {competition.type && <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize dark:bg-slate-800">{competition.type}</span>}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 capitalize dark:bg-slate-800">{competition.status}</span>
                      {competition.startTime && <span>{new Date(competition.startTime).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

export default Home