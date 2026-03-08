import { useState, useRef, KeyboardEvent, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { PageContainer, Card } from '../../shared/components';

type LeaderboardTimeframe = 'daily' | 'weekly' | 'monthly' | 'allTime';
type UserRank = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';

interface LeaderboardUser {
  id: number;
  username: string;
  rank: number;
  score: number;
  previousRank: number;
  problemsSolved: number;
  successRate: number;
  streak: number;
  userRank: string;
  joinDate: string;
}

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
    switch (userRank) {
      case 'Bronze': return 'text-orange-700';
      case 'Silver': return 'text-gray-300';
      case 'Gold': return 'text-yellow-500';
      case 'Platinum': return 'text-cyan-400';
      case 'Diamond': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getUserRankBg = (userRank: UserRank): string => {
    switch (userRank) {
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

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading when timeframe changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeframe]);

return (
  <PageContainer maxWidth="7xl" className="py-12">
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Leaderboard</h1>

    {/* Tabs and Search */}
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      {/* Tabs */}
      <div ref={tabListRef} role="tablist" className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
        {timeframes.map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={timeframe === t}
            onKeyDown={(e) => handleTabKeyDown(e, t)}
            onClick={() => { setTimeframe(t); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${timeframe === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1).replace(/([A-Z])/g, ' $1')}
          </button>
        ))}
      </div>
      {/* Search */}
      <div className="w-full md:w-64">
        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>
    </div>

    <Card className="overflow-hidden p-0 border-0 shadow-lg">
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex flex-col md:flex-row items-center gap-4 h-auto md:h-16 p-4 md:p-0 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Rank</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">User</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Tier</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Score</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Success Rate</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-300">Streak</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">No users found</td>
                </tr>
              ) : (
                currentUsers.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-full text-white text-sm font-bold ${getRankColor(u.rank)}`}>
                          {u.rank}
                        </span>
                        <div className="flex items-center gap-1">
                          {getRankChangeIcon(u.rank, u.previousRank)}
                          <span className="text-xs text-gray-400">{getRankChangeText(u.rank, u.previousRank)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                        {u.username.substring(0, 2)}
                      </div>
                      {u.username}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getUserRankBg(u.userRank as any)} ${getUserRankColor(u.userRank as any)}`}>
                        {u.userRank}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">{u.score.toLocaleString()}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.successRate}%</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{u.streak} 🔥</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <span className="text-sm text-gray-500">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredUsers.length)} of {filteredUsers.length}
          </span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="px-3 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="px-3 py-1 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </Card>
  </PageContainer>
);
}

export default Leaderboard;
