import { useState } from 'react';
import { Search, Filter, TrendingUp, Clock, Trophy, CheckCircle } from 'lucide-react';

type ChallengeStatus = 'solved' | 'attempted' | 'unsolved';
type ChallengeDifficulty = 'Easy' | 'Medium' | 'Hard';
type ChallengeTopic = 'Arrays' | 'Strings' | 'DP' | 'Graphs' | 'Sorting' | 'Searching' | 'Math' | 'Greedy';

interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  topics: ChallengeTopic[];
  acceptanceRate: number;
  submissions: number;
  timeLimit: number;
  memoryLimit: number;
  status: ChallengeStatus;
  points: number;
  aiGenerated: boolean;
}

function Challenges() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<ChallengeDifficulty | 'All'>('All');
  const [selectedTopic, setSelectedTopic] = useState<ChallengeTopic | 'All'>('All');
  const [showOnlyAIGenerated, setShowOnlyAIGenerated] = useState(false);

  const difficulties: ChallengeDifficulty[] = ['Easy', 'Medium', 'Hard'];
  const topics: ChallengeTopic[] = ['Arrays', 'Strings', 'DP', 'Graphs', 'Sorting', 'Searching', 'Math', 'Greedy'];

  const challenges: Challenge[] = [
    {
      id: 1,
      title: "Two Sum",
      description: "Find two numbers that add up to a target",
      difficulty: "Easy",
      topics: ["Arrays", "Searching"],
      acceptanceRate: 78,
      submissions: 1200000,
      timeLimit: 2000,
      memoryLimit: 256,
      status: "solved",
      points: 100,
      aiGenerated: false
    },
    {
      id: 2,
      title: "Longest Palindromic Substring",
      description: "Find the longest palindrome in a string",
      difficulty: "Medium",
      topics: ["Strings", "DP"],
      acceptanceRate: 42,
      submissions: 850000,
      timeLimit: 3000,
      memoryLimit: 256,
      status: "attempted",
      points: 250,
      aiGenerated: true
    },
    {
      id: 3,
      title: "Merge K Sorted Lists",
      description: "Efficiently merge multiple sorted lists",
      difficulty: "Hard",
      topics: ["Sorting", "Graphs"],
      acceptanceRate: 28,
      submissions: 450000,
      timeLimit: 5000,
      memoryLimit: 512,
      status: "unsolved",
      points: 500,
      aiGenerated: true
    },
    {
      id: 4,
      title: "Binary Tree Maximum Path Sum",
      description: "Find maximum path sum in binary tree",
      difficulty: "Hard",
      topics: ["Graphs", "DP"],
      acceptanceRate: 32,
      submissions: 520000,
      timeLimit: 4000,
      memoryLimit: 512,
      status: "unsolved",
      points: 450,
      aiGenerated: false
    },
    {
      id: 5,
      title: "Valid Parentheses",
      description: "Check if parentheses are properly closed",
      difficulty: "Easy",
      topics: ["Strings", "Sorting"],
      acceptanceRate: 85,
      submissions: 950000,
      timeLimit: 1000,
      memoryLimit: 128,
      status: "solved",
      points: 75,
      aiGenerated: false
    },
    {
      id: 6,
      title: "AI-Generated: Optimal Matrix Rotation",
      description: "Rotate matrix with minimal operations",
      difficulty: "Medium",
      topics: ["Arrays", "Math"],
      acceptanceRate: 45,
      submissions: 120000,
      timeLimit: 3500,
      memoryLimit: 256,
      status: "unsolved",
      points: 300,
      aiGenerated: true
    }
  ];

  const getDifficultyColor = (difficulty: ChallengeDifficulty): string => {
    switch(difficulty) {
      case 'Easy': return 'bg-green-500 text-green-100';
      case 'Medium': return 'bg-yellow-500 text-yellow-100';
      case 'Hard': return 'bg-red-500 text-red-100';
      default: return 'bg-gray-500 text-gray-100';
    }
  };

  const getStatusIcon = (status: ChallengeStatus) => {
    switch(status) {
      case 'solved': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'attempted': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'unsolved': return <div className="w-5 h-5 border-2 border-gray-500 rounded-full" />;
      default: return null;
    }
  };

  const getStatusText = (status: ChallengeStatus) => {
    switch(status) {
      case 'solved': return 'Solved';
      case 'attempted': return 'Attempted';
      case 'unsolved': return 'Unsolved';
      default: return '';
    }
  };

  const filteredChallenges = challenges.filter(challenge => {
    const matchesSearch = challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         challenge.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         challenge.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesDifficulty = selectedDifficulty === 'All' || challenge.difficulty === selectedDifficulty;
    const matchesTopic = selectedTopic === 'All' || challenge.topics.includes(selectedTopic);
    const matchesAI = !showOnlyAIGenerated || challenge.aiGenerated;
    
    return matchesSearch && matchesDifficulty && matchesTopic && matchesAI;
  });

  const stats = {
    solved: challenges.filter(c => c.status === 'solved').length,
    attempted: challenges.filter(c => c.status === 'attempted').length,
    total: challenges.length,
    averageDifficulty: challenges.reduce((sum, c) => {
      const weight = c.difficulty === 'Easy' ? 1 : c.difficulty === 'Medium' ? 2 : 3;
      return sum + weight;
    }, 0) / challenges.length
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              ByteBattle Challenges
            </h1>
            <p className="text-gray-400 mt-2">Practice coding problems with AI-generated challenges</p>
          </div>
          <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
            Generate AI Challenge
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center">
              <div className="bg-green-500/20 p-3 rounded-lg mr-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.solved}/{stats.total}</div>
                <div className="text-gray-400">Solved</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center">
              <div className="bg-yellow-500/20 p-3 rounded-lg mr-4">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.attempted}</div>
                <div className="text-gray-400">Attempted</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center">
              <div className="bg-blue-500/20 p-3 rounded-lg mr-4">
                <TrendingUp className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.averageDifficulty.toFixed(1)}</div>
                <div className="text-gray-400">Avg Difficulty</div>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="flex items-center">
              <div className="bg-purple-500/20 p-3 rounded-lg mr-4">
                <Trophy className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {challenges.reduce((sum, c) => sum + (c.status === 'solved' ? c.points : 0), 0)}
                </div>
                <div className="text-gray-400">Total Points</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search challenges by title, description, or topic..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  className="pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value as ChallengeDifficulty | 'All')}
                >
                  <option value="All">All Difficulties</option>
                  {difficulties.map(diff => (
                    <option key={diff} value={diff}>{diff}</option>
                  ))}
                </select>
              </div>
              <select
                className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value as ChallengeTopic | 'All')}
              >
                <option value="All">All Topics</option>
                {topics.map(topic => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center mt-4">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={showOnlyAIGenerated}
                  onChange={(e) => setShowOnlyAIGenerated(e.target.checked)}
                />
                <div className={`block w-12 h-6 rounded-full transition-colors ${showOnlyAIGenerated ? 'bg-blue-500' : 'bg-gray-700'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${showOnlyAIGenerated ? 'transform translate-x-6' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm text-gray-300">Show only AI-generated challenges</span>
            </label>
          </div>
        </div>

        {/* Challenges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredChallenges.map(challenge => (
            <div key={challenge.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:transform hover:scale-[1.02]">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                    {challenge.aiGenerated && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500">
                        🤖 AI
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-1">{challenge.title}</h3>
                  <p className="text-gray-400 text-sm mb-3">{challenge.description}</p>
                </div>
                <div className="flex flex-col items-center">
                  {getStatusIcon(challenge.status)}
                  <span className="text-xs text-gray-400 mt-1">{getStatusText(challenge.status)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {challenge.topics.map(topic => (
                  <span key={topic} className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                    {topic}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                <div className="text-center">
                  <div className="text-gray-400">Acceptance</div>
                  <div className="font-bold text-green-400">{challenge.acceptanceRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Submissions</div>
                  <div className="font-bold">{(challenge.submissions / 1000).toFixed(1)}k</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Time Limit</div>
                  <div className="font-bold">{challenge.timeLimit}ms</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400">Memory</div>
                  <div className="font-bold">{challenge.memoryLimit}MB</div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                  <span className="font-bold text-yellow-400">{challenge.points} XP</span>
                </div>
                <button className={`px-6 py-2 rounded-lg font-semibold transition-all duration-300 ${
                  challenge.status === 'solved' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                }`}>
                  {challenge.status === 'solved' ? 'View Solution' : 'Solve Challenge'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredChallenges.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-lg mb-4">No challenges found matching your criteria</div>
            <button 
              className="text-blue-400 hover:text-blue-300"
              onClick={() => {
                setSearchQuery('');
                setSelectedDifficulty('All');
                setSelectedTopic('All');
                setShowOnlyAIGenerated(false);
              }}
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Difficulty Distribution */}
        <div className="mt-12 bg-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-6">Challenge Distribution</h2>
          <div className="grid grid-cols-3 gap-4">
            {difficulties.map(diff => {
              const count = challenges.filter(c => c.difficulty === diff).length;
              const percentage = (count / challenges.length) * 100;
              return (
                <div key={diff} className="text-center">
                  <div className={`text-lg font-bold mb-2 ${getDifficultyColor(diff)} px-3 py-1 rounded-full inline-block`}>
                    {diff}
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-gray-400">challenges</div>
                  <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${diff === 'Easy' ? 'bg-green-500' : diff === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Challenges;