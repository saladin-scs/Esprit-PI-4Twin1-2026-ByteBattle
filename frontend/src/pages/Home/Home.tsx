import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import { PageContainer, Card, Button } from '../../shared/components';
import { Trophy, Zap, BarChart3 } from 'lucide-react';

function Home() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <PageContainer maxWidth="7xl" className="relative py-12 md:py-16">
      <div className="bb-hero-gradient-tall" aria-hidden />

      <div className="relative text-center">
        <div className="bb-kicker mx-auto mb-4 w-fit">
          <Zap className="h-3.5 w-3.5" aria-hidden />
          ByteBattle
        </div>
        <h1 className="mb-6 flex justify-center">
          <img
            src="/bytebattle-logo.png"
            alt="Byte Battle"
            className="h-24 w-auto origin-center sm:h-28 md:h-32"
            style={{ transform: 'rotate(-10deg)' }}
          />
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

      <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
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
      </div>
    </PageContainer>
  );
}

export default Home;
