import { useState, useRef, KeyboardEvent } from 'react';
import { Trophy, TrendingUp, TrendingDown, Crown, Target, Award, Star, Users } from 'lucide-react';

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
  userRank: UserRank;
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Skip to main content link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white p-2 rounded z-50">
        Skip to main content
      </a>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-600 bg-clip-text text-transparent">
              ByteBattle Leaderboard
            </h1>
            <p className="text-gray-400 mt-2">Climb the ranks and compete with the best programmers</p>
          </div>
          <div className="flex items-center">
            <div className="text-right mr-6">
              <div className="text-sm text-gray-400">Your Rank</div>
              <div className="text-2xl font-bold">#127</div>
            </div>
            <button
              aria-label="View your profile"
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-300 focus:outline-none text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              View Profile
            </button>
          </div>
        </header>

        {/* Main content area */}
        <main id="main-content">
          {/* Stats Cards */}
          <section aria-labelledby="stats-heading" className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <h2 id="stats-heading" className="sr-only">Statistics</h2>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-yellow-500/20 p-3 rounded-lg mr-4" aria-hidden="true">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
                  <div className="text-gray-400">Total Coders</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-green-500/20 p-3 rounded-lg mr-4" aria-hidden="true">
                  <Target className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{Math.round(stats.averageScore).toLocaleString()}</div>
                  <div className="text-gray-400">Avg Score</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-purple-500/20 p-3 rounded-lg mr-4" aria-hidden="true">
                  <Award className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.top3Score.toLocaleString()}</div>
                  <div className="text-gray-400">Top 3 Score</div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="flex items-center">
                <div className="bg-blue-500/20 p-3 rounded-lg mr-4" aria-hidden="true">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats.activeToday}</div>
                  <div className="text-gray-400">Active Today</div>
                </div>
              </div>
            </div>
          </section>

          {/* Timeframe Tabs and Search */}
          <section aria-labelledby="filter-heading" className="bg-gray-800 rounded-xl p-6 mb-8">
            <h2 id="filter-heading" className="sr-only">Filter leaderboard by time and search for coder</h2>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div
                className="bg-gray-900 rounded-lg p-1 inline-flex"
                role="tablist"
                aria-label="Leaderboard timeframe"
                ref={tabListRef}
              >
                {timeframes.map((time) => {
                  const isActive = timeframe === time;
                  return (
                    <button
                      key={time}
                      role="tab"
                      id={`tab-${time}`}
                      aria-selected={isActive}
                      aria-controls={`panel-${time}`}
                      tabIndex={isActive ? 0 : -1}
                      onClick={() => setTimeframe(time)}
                      onKeyDown={(e) => handleTabKeyDown(e, time)}
                      className={`px-6 py-2 rounded-md font-medium transition-all duration-300 capitalize focus:outline-none focus:ring-2 focus:ring-yellow-400 ${
                        isActive
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {time === 'allTime' ? 'All Time' : time}
                    </button>
                  );
                })}
              </div>
              <div className="w-full md:w-auto">
                <label htmlFor="search-coder" className="sr-only">Search for a coder</label>
                <input
                  id="search-coder"
                  type="text"
                  placeholder="Search for a coder..."
                  className="w-full md:w-64 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Top 3 Podium (hidden when searching) */}
          {!searchQuery && (
            <section aria-labelledby="podium-heading" className="mb-12">
              <h2 id="podium-heading" className="text-2xl font-bold mb-6">Top Performers</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {users.slice(0, 3).map((user, index) => (
                  <div key={user.id} className={`rounded-xl p-6 ${index === 0 ? 'md:order-2' : index === 1 ? 'md:order-1' : 'md:order-3'}`}>
                    <div className={`${getRankColor(user.rank)} p-8 rounded-xl text-center relative`}>
                      {user.rank === 1 && (
                        <Crown className="w-8 h-8 text-yellow-300 absolute -top-4 left-1/2 transform -translate-x-1/2" aria-hidden="true" />
                      )}
                      <div className="text-6xl font-bold mb-4" aria-label={`Rank ${user.rank}`}>{user.rank}</div>
                      <div className="text-2xl font-bold mb-2">{user.username}</div>
                      <div className="text-lg">{user.score.toLocaleString()} XP</div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-gray-400">Problems</div>
                        <div className="font-bold">{user.problemsSolved}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-gray-400">Success Rate</div>
                        <div className="font-bold text-green-400">{user.successRate}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Leaderboard Table */}
          <section aria-labelledby="table-heading" className="bg-gray-800 rounded-xl overflow-hidden">
            <h2 id="table-heading" className="sr-only">Detailed leaderboard</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <caption className="sr-only">Leaderboard of top coders</caption>
                <thead>
                  <tr className="bg-gray-900">
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Rank</th>
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Coder</th>
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Score</th>
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Problems Solved</th>
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Success Rate</th>
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Streak</th>
                    <th scope="col" className="py-4 px-6 text-left font-semibold">Rank Change</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getRankColor(user.rank)}`}>
                          {user.rank}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center font-bold mr-4" aria-hidden="true">
                            {user.username.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold">{user.username}</div>
                            <div className="flex items-center mt-1">
                              <span className={`px-2 py-1 rounded text-xs ${getUserRankBg(user.userRank)} ${getUserRankColor(user.userRank)}`}>
                                {user.userRank}
                              </span>
                              <span className="ml-2 text-xs text-gray-400">Joined {user.joinDate}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Trophy className="w-5 h-5 text-yellow-500 mr-2" aria-hidden="true" />
                          <span className="font-bold text-xl">{user.score.toLocaleString()}</span>
                          <span className="text-gray-400 ml-2">XP</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Target className="w-5 h-5 text-green-500 mr-2" aria-hidden="true" />
                          <span className="font-bold">{user.problemsSolved}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <div className="w-full bg-gray-700 rounded-full h-2 mr-3" aria-hidden="true">
                            <div 
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${user.successRate}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-green-400">{user.successRate}%</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          <Star className="w-5 h-5 text-orange-500 mr-2" aria-hidden="true" />
                          <span className="font-bold">{user.streak} days</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center">
                          {getRankChangeIcon(user.rank, user.previousRank)}
                          <span className={`ml-2 font-bold ${
                            user.rank < user.previousRank ? 'text-green-500' :
                            user.rank > user.previousRank ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {getRankChangeText(user.rank, user.previousRank)}
                          </span>
                          <span className="sr-only">
                            {user.rank < user.previousRank ? 'Rank increased' : user.rank > user.previousRank ? 'Rank decreased' : 'Rank unchanged'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* No results message */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-4">No users found matching "{searchQuery}"</div>
              <button 
                className="text-yellow-400 hover:text-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </button>
            </div>
          )}

          {/* Your Stats */}
          <section aria-labelledby="your-stats-heading" className="mt-12 bg-gray-800 rounded-xl p-6">
            <h2 id="your-stats-heading" className="text-2xl font-bold mb-6">Your Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-400">#127</div>
                <div className="text-gray-400">Global Rank</div>
                <div className="mt-2 text-sm text-green-400">↑ Up 12 positions this week</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">78%</div>
                <div className="text-gray-400">Success Rate</div>
                <div className="mt-2 text-sm text-green-400">↑ 5% improvement</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400">15</div>
                <div className="text-gray-400">Day Streak</div>
                <div className="mt-2 text-sm text-orange-400">🔥 Keep going!</div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-600 focus:ring-4 focus:ring-green-300 focus:outline-none text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300">
                Start New Challenge to Rank Up
              </button>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Leaderboard;