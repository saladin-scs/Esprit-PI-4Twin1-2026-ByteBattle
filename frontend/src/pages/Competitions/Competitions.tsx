import { PageContainer, Card } from '../../shared/components';

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
    <PageContainer maxWidth="7xl" className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Competitions</h1>
      <Card>
        <p className="text-gray-500 dark:text-gray-400">Competitions coming soon…</p>
      </Card>
    </PageContainer>
  );
}

export default Competitions;
