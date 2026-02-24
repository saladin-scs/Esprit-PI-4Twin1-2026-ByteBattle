import { useState, useRef, KeyboardEvent } from 'react';

type CompetitionStatus = 'Live' | 'Waiting for players' | 'Upcoming' | 'Completed';
type CompetitionType = '1v1' | 'Team' | 'Solo';
type CompetitionTab = 'ongoing' | 'upcoming' | 'completed';

interface Competition {
  id: number;
  title: string;
  type: CompetitionType;
  difficulty: string;
  participants?: number;
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
  const tabListRef = useRef<HTMLDivElement>(null);

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
        participants: 2,
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

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, _tab: CompetitionTab) => {
    const tabs: CompetitionTab[] = ['ongoing', 'upcoming', 'completed'];
    const currentIndex = tabs.indexOf(activeTab);
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
    setActiveTab(tabs[newIndex]);

    // Focus the newly selected tab button
    const tabButtons = tabListRef.current?.querySelectorAll('[role="tab"]');
    if (tabButtons) {
      (tabButtons[newIndex] as HTMLButtonElement).focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Skip to main content link (hidden but focusable) */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white p-2 rounded z-50">
        Skip to main content
      </a>

      {/* Header */}
      <header className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
              ByteBattle Arena
            </h1>
            <p className="text-gray-400 mt-2">Test your skills in real-time coding competitions</p>
          </div>
          <button
            aria-label="Create new competition"
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-600 focus:ring-4 focus:ring-green-300 focus:outline-none text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Create Competition +
          </button>
        </div>

        {/* Game Modes Section */}
        <section aria-labelledby="game-modes-heading" className="mb-10">
          <h2 id="game-modes-heading" className="text-2xl font-bold mb-6">Choose Your Battle Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gameModes.map((mode) => (
              <article
                key={mode.id}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 focus-within:border-blue-500 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500"
              >
                <div className="flex items-center mb-4">
                  <div className={`${mode.color} w-12 h-12 rounded-lg flex items-center justify-center text-2xl mr-4`} aria-hidden="true">
                    {mode.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{mode.title}</h3>
                    <p className="text-gray-400 text-sm">{mode.description}</p>
                  </div>
                </div>
                <ul className="space-y-2" aria-label={`Features of ${mode.title}`}>
                  {mode.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <span className="text-green-500 mr-2" aria-hidden="true">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  className="mt-6 w-full bg-gray-700 hover:bg-gray-600 focus:ring-4 focus:ring-blue-500 focus:outline-none py-2 rounded-lg transition-colors group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600"
                  aria-label={`Start ${mode.title}`}
                >
                  Start {mode.title}
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* Main content area */}
        <main id="main-content">
          {/* Competition Tabs */}
          <div
            className="bg-gray-800 rounded-xl p-1 mb-6 inline-flex"
            role="tablist"
            aria-label="Competition categories"
            ref={tabListRef}
          >
            {(['ongoing', 'upcoming', 'completed'] as CompetitionTab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  id={`tab-${tab}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${tab}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setActiveTab(tab)}
                  onKeyDown={(e) => handleTabKeyDown(e, tab)}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 capitalize focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab} ({competitions[tab].length})
                </button>
              );
            })}
          </div>

          {/* Tab Panels */}
          {(['ongoing', 'upcoming', 'completed'] as CompetitionTab[]).map((tab) => (
            <div
              key={tab}
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              hidden={activeTab !== tab}
              className="space-y-6"
            >
              {competitions[tab].map((comp) => (
                <article
                  key={comp.id}
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-500 focus-within:border-blue-500 transition-all duration-300 focus-within:ring-2 focus-within:ring-blue-500"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2" aria-label={`Status: ${comp.status}, Type: ${comp.type}, Difficulty: ${comp.difficulty}`}>
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
                      <dl className="flex flex-wrap gap-4 text-sm text-gray-400">
                        {comp.participants !== undefined && (
                          <div className="flex items-center">
                            <dt className="sr-only">Participants</dt>
                            <dd className="flex items-center">
                              <span className="mr-2" aria-hidden="true">👥</span>
                              {comp.maxParticipants
                                ? `${comp.participants}/${comp.maxParticipants} players`
                                : `${comp.participants} participants`
                              }
                            </dd>
                          </div>
                        )}
                        <div className="flex items-center">
                          <dt className="sr-only">Duration</dt>
                          <dd className="flex items-center">
                            <span className="mr-2" aria-hidden="true">⏱️</span>
                            {comp.duration}
                          </dd>
                        </div>
                        <div className="flex items-center">
                          <dt className="sr-only">Prize</dt>
                          <dd className="flex items-center">
                            <span className="mr-2" aria-hidden="true">🏆</span>
                            {comp.prize}
                          </dd>
                        </div>
                        <div className="flex items-center">
                          <dt className="sr-only">Time</dt>
                          <dd className="flex items-center">
                            <span className="mr-2" aria-hidden="true">📅</span>
                            {comp.startTime || comp.endTime}
                          </dd>
                        </div>
                        {comp.winner && (
                          <div className="flex items-center">
                            <dt className="sr-only">Winner</dt>
                            <dd className="flex items-center">
                              <span className="mr-2" aria-hidden="true">👑</span>
                              Winner: {comp.winner}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6">
                      <button
                        className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-600 focus:ring-4 focus:ring-blue-300 focus:outline-none text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 w-full md:w-auto"
                        aria-label={`${comp.status === 'Completed' ? 'View results for' : comp.status === 'Upcoming' ? 'Set reminder for' : comp.status === 'Waiting for players' ? 'Join' : 'Spectate'} ${comp.title}`}
                      >
                        {comp.status === 'Completed' ? 'View Results' : 
                         comp.status === 'Upcoming' ? 'Set Reminder' : 
                         comp.status === 'Waiting for players' ? 'Join Now' : 
                         'Spectate'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ))}

          {/* Quick Match Section (only visible when ongoing tab is active) */}
          {activeTab === 'ongoing' && (
            <section aria-labelledby="quick-match-heading" className="mt-10 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-8 border border-gray-700">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div>
                  <h2 id="quick-match-heading" className="text-2xl font-bold mb-2">Quick Match 1v1</h2>
                  <p className="text-gray-400">Get matched instantly with an opponent of similar skill</p>
                </div>
                <div className="flex items-center mt-4 md:mt-0">
                  <div className="mr-6 text-center">
                    <div className="text-2xl font-bold text-green-500" aria-label="Online players">42</div>
                    <div className="text-sm text-gray-400">Online Players</div>
                  </div>
                  <button
                    aria-label="Find opponent for quick match"
                    className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-600 focus:ring-4 focus:ring-red-300 focus:outline-none text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    🚀 Find Opponent
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Statistics Section */}
          <section aria-labelledby="stats-heading" className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
            <h2 id="stats-heading" className="sr-only">Statistics</h2>
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
          </section>
        </main>
      </header>
    </div>
  );
}

export default Competitions;