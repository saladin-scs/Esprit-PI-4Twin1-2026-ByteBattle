import { PageContainer, Card } from '../../shared/components';

function Leaderboard() {
  const [timeframe, setTimeframe] = useState<LeaderboardTimeframe>('weekly');
  const [searchQuery, setSearchQuery] = useState('');
  const tabListRef = useRef<HTMLDivElement>(null);

  const timeframes: LeaderboardTimeframe[] = ['daily', 'weekly', 'monthly', 'allTime'];

  const users: LeaderboardUser[] = [
    {
      id: 1,
      username: "CodeMaster42",
      rank: 1,
      score: 12500,
      previousRank: 1,
      problemsSolved: 450,
      successRate: 92,
      streak: 28,
      userRank: "Diamond",
      joinDate: "2023-01-15"
    },
    {
      id: 2,
      username: "AlgoWizard",
      rank: 2,
      score: 11800,
      previousRank: 3,
      problemsSolved: 420,
      successRate: 89,
      streak: 21,
      userRank: "Diamond",
      joinDate: "2023-03-20"
    },
    {
      id: 3,
      username: "ByteQueen",
      rank: 3,
      score: 11200,
      previousRank: 2,
      problemsSolved: 410,
      successRate: 94,
      streak: 35,
      userRank: "Diamond",
      joinDate: "2022-11-05"
    },
    {
      id: 4,
      username: "SyntaxSamurai",
      rank: 4,
      score: 9800,
      previousRank: 5,
      problemsSolved: 380,
      successRate: 87,
      streak: 14,
      userRank: "Platinum",
      joinDate: "2023-05-10"
    },
    {
      id: 5,
      username: "ReactNinja",
      rank: 5,
      score: 9200,
      previousRank: 4,
      problemsSolved: 350,
      successRate: 85,
      streak: 7,
      userRank: "Platinum",
      joinDate: "2023-07-22"
    },
    {
      id: 6,
      username: "PythonProdigy",
      rank: 6,
      score: 8500,
      previousRank: 8,
      problemsSolved: 320,
      successRate: 88,
      streak: 42,
      userRank: "Gold",
      joinDate: "2023-02-14"
    },
    {
      id: 7,
      username: "DataDuke",
      rank: 7,
      score: 7800,
      previousRank: 6,
      problemsSolved: 300,
      successRate: 82,
      streak: 3,
      userRank: "Gold",
      joinDate: "2023-04-30"
    },
    {
      id: 8,
      username: "JavaKnight",
      rank: 8,
      score: 7200,
      previousRank: 10,
      problemsSolved: 280,
      successRate: 79,
      streak: 19,
      userRank: "Silver",
      joinDate: "2023-08-15"
    },
    {
      id: 9,
      username: "SwiftSage",
      rank: 9,
      score: 6800,
      previousRank: 7,
      problemsSolved: 260,
      successRate: 84,
      streak: 5,
      userRank: "Silver",
      joinDate: "2023-06-18"
    },
    {
      id: 10,
      username: "RustRider",
      rank: 10,
      score: 6200,
      previousRank: 9,
      problemsSolved: 240,
      successRate: 76,
      streak: 12,
      userRank: "Bronze",
      joinDate: "2023-09-01"
    }
  ];

  const getRankColor = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-400';
    if (rank === 3) return 'bg-gradient-to-r from-orange-500 to-orange-600';
    return 'bg-gray-700';
  };

  const getUserRankColor = (userRank: UserRank): string => {
    switch(userRank) {
      case 'Bronze': return 'text-orange-700';
      case 'Silver': return 'text-gray-300';
      case 'Gold': return 'text-yellow-500';
      case 'Platinum': return 'text-cyan-400';
      case 'Diamond': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getUserRankBg = (userRank: UserRank): string => {
    switch(userRank) {
      case 'Bronze': return 'bg-orange-700/20';
      case 'Silver': return 'bg-gray-300/20';
      case 'Gold': return 'bg-yellow-500/20';
      case 'Platinum': return 'bg-cyan-400/20';
      case 'Diamond': return 'bg-purple-400/20';
      default: return 'bg-gray-400/20';
    }
  };

  const getRankChangeIcon = (currentRank: number, previousRank: number) => {
    if (currentRank < previousRank) {
      return <TrendingUp className="w-4 h-4 text-green-500" aria-hidden="true" />;
    } else if (currentRank > previousRank) {
      return <TrendingDown className="w-4 h-4 text-red-500" aria-hidden="true" />;
    }
    return null;
  };

  const getRankChangeText = (currentRank: number, previousRank: number) => {
    const change = previousRank - currentRank;
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return "—";
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    totalUsers: 12543,
    averageScore: users.reduce((sum, user) => sum + user.score, 0) / users.length,
    top3Score: users.slice(0, 3).reduce((sum, user) => sum + user.score, 0),
    activeToday: 842
  };

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, _tab: LeaderboardTimeframe) => {
    const tabs = timeframes;
    const currentIndex = tabs.indexOf(timeframe);
    let newIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      newIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      newIndex = 0;
    } else if (e.key === 'End') {
      newIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setTimeframe(tabs[newIndex]);

    // Focus the newly selected tab button
    const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]');
    if (tabButtons) {
      (tabButtons[newIndex] as HTMLButtonElement).focus();
    }
  };

  return (
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Leaderboard</h1>
      <Card>
        <p className="text-gray-500 dark:text-gray-400">Leaderboard coming soon…</p>
      </Card>
    </PageContainer>
  );
}

export default Leaderboard;
