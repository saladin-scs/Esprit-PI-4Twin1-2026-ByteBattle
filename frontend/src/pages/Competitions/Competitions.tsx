import { useState } from 'react';

type CompetitionStatus = 'Live' | 'Waiting for players' | 'Upcoming' | 'Completed';
type CompetitionType = '1v1' | 'Team' | 'Solo';
type CompetitionTab = 'ongoing' | 'upcoming' | 'completed';

interface Competition {
  id: number;
  title: string;
  type: CompetitionType;
  difficulty: string;
  participants?: number; // Made optional
  maxParticipants?: number;
  duration: string;
  prize: string;
  status: CompetitionStatus;
  startTime?: string;
  endTime?: string;
  winner?: string;
}

interface GameMode {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
}

function Competitions() {
  const [activeTab, setActiveTab] = useState<CompetitionTab>('ongoing');
  
  const competitions: Record<CompetitionTab, Competition[]> = {
    ongoing: [
      {
        id: 1,
        title: "Weekly Algorithm Showdown",
        type: "1v1",
        difficulty: "Medium",
        participants: 42,
        duration: "45 min",
        prize: "Premium Badge + 500 XP",
        status: "Live",
        startTime: "Started 15 min ago"
      },
      {
        id: 2,
        title: "Data Structures Championship",
        type: "Team",
        difficulty: "Hard",
        participants: 8,
        maxParticipants: 16,
        duration: "2 hours",
        prize: "Elite Rank + Custom Avatar",
        status: "Waiting for players",
        startTime: "Starts in 10 min"
      }
    ],
    upcoming: [
      {
        id: 3,
        title: "Python Speed Challenge",
        type: "Solo",
        difficulty: "Easy",
        participants: 156,
        duration: "30 min",
        prize: "Speedster Badge + 250 XP",
        status: "Upcoming",
        startTime: "Tomorrow, 6:00 PM"
      },
      {
        id: 4,
        title: "Frontend Masters",
        type: "Team",
        difficulty: "Medium",
        participants: 24,
        maxParticipants: 32,
        duration: "90 min",
        prize: "Master Developer Title",
        status: "Upcoming",
        startTime: "In 2 days"
      }
    ],
    completed: [
      {
        id: 5,
        title: "March Madness Coding",
        type: "1v1",
        difficulty: "Hard",
        participants: 2, // Added participants for completed competition
        duration: "60 min",
        prize: "Champion Trophy",
        status: "Completed",
        winner: "CodeMaster42",
        endTime: "Ended 2 days ago"
      }
    ]
  };

  const gameModes: GameMode[] = [
    {
      id: 'solo',
      title: 'Solo Challenge',
      description: 'Solve problems at your own pace',
      icon: '👨‍💻',
      color: 'bg-blue-500',
      features: ['Self-paced', 'Practice mode', 'AI feedback']
    },
    {
      id: '1v1',
      title: '1v1 Battle',
      description: 'Real-time coding duel',
      icon: '⚔️',
      color: 'bg-red-500',
      features: ['Live opponent', 'Ranked matches', 'Time pressure']
    },
    {
      id: 'team',
      title: 'Team Competition',
      description: 'Collaborate and compete',
      icon: '👥',
      color: 'bg-green-500',
      features: ['2-4 players', 'Shared workspace', 'Team ranking']
    }
  ];

  const getStatusColor = (status: CompetitionStatus): string => {
    switch(status.toLowerCase()) {
      case 'live': return 'bg-red-500 animate-pulse';
      case 'waiting for players': return 'bg-yellow-500';
      case 'upcoming': return 'bg-blue-500';
      case 'completed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: CompetitionType): string => {
    switch(type.toLowerCase()) {
      case '1v1': return 'border-red-500 text-red-500';
      case 'team': return 'border-green-500 text-green-500';
      case 'solo': return 'border-blue-500 text-blue-500';
      default: return 'border-gray-500 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              ByteBattle Arena
            </h1>
            <p className="text-gray-400 mt-2">Test your skills in real-time coding competitions</p>
          </div>
          <button className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
            Create Competition +
          </button>
        </div>

        {/* Game Modes */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold mb-6">Choose Your Battle Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameModes.map((mode) => (
              <div 
                key={mode.id}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 transition-all duration-300 hover:transform hover:scale-[1.02] cursor-pointer group"
              >
                <div className="flex items-center mb-4">
                  <div className={`${mode.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl mr-4`}>
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{mode.title}</h3>
                    <p className="text-gray-400 text-sm">{mode.description}</p>
                  </div>
                </div>
                <ul className="space-y-2">
                  {mode.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="text-green-500 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button className="mt-6 w-full bg-gray-700 hover:bg-gray-600 py-2 rounded-lg transition-colors group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600">
                  Start {mode.title}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Competition Tabs */}
        <div className="bg-gray-800 rounded-xl p-1 mb-6 inline-flex">
          {(['ongoing', 'upcoming', 'completed'] as CompetitionTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 capitalize ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab} ({competitions[tab].length})
            </button>
          ))}
        </div>

        {/* Competitions List */}
        <div className="space-y-6">
          {competitions[activeTab].map((comp) => (
            <div key={comp.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(comp.status)}`}>
                      {comp.status}
                    </span>
                    <span className={`ml-3 px-3 py-1 rounded-full text-xs border ${getTypeColor(comp.type)}`}>
                      {comp.type}
                    </span>
                    <span className="ml-3 px-3 py-1 rounded-full text-xs bg-gray-700">
                      {comp.difficulty}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{comp.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    {comp.participants !== undefined && (
                      <div className="flex items-center">
                        <span className="mr-2">👥</span>
                        {comp.maxParticipants 
                          ? `${comp.participants}/${comp.maxParticipants} players`
                          : `${comp.participants} participants`
                        }
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="mr-2">⏱️</span>
                      {comp.duration}
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🏆</span>
                      {comp.prize}
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      {comp.startTime || comp.endTime}
                    </div>
                    {comp.winner && (
                      <div className="flex items-center">
                        <span className="mr-2">👑</span>
                        Winner: {comp.winner}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6">
                  <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 w-full md:w-auto">
                    {comp.status === 'Completed' ? 'View Results' : 
                     comp.status === 'Upcoming' ? 'Set Reminder' : 
                     comp.status === 'Waiting for players' ? 'Join Now' : 
                     'Spectate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Match Section */}
        {activeTab === 'ongoing' && (
          <div className="mt-10 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">Quick Match 1v1</h2>
                <p className="text-gray-400">Get matched instantly with an opponent of similar skill</p>
              </div>
              <div className="flex items-center mt-4 md:mt-0">
                <div className="mr-6 text-center">
                  <div className="text-2xl font-bold text-green-500">42</div>
                  <div className="text-sm text-gray-400">Online Players</div>
                </div>
                <button className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg animate-pulse">
                  🚀 Find Opponent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-blue-400">156</div>
            <div className="text-gray-400">Total Competitions</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-green-400">2,843</div>
            <div className="text-gray-400">Active Participants</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-yellow-400">342</div>
            <div className="text-gray-400">XP Earned Today</div>
          </div>
          <div className="bg-gray-800 rounded-xl p-6">
            <div className="text-3xl font-bold text-purple-400">24</div>
            <div className="text-gray-400">Live Battles</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Competitions;