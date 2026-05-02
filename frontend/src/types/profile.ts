export interface RankProgress {
  currentTier: string;
  nextTier: string | null;
  xpInTier: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export interface SocialLinks {
  github?: string;
  linkedin?: string;
  twitter?: string;
  portfolio?: string;
}

export interface ProblemsByDifficulty {
  easy: number;
  medium: number;
  hard: number;
}

export interface FullProfile {
  _id: string;
  username: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  country?: string;
  avatarUrl?: string;
  coverImage?: string;
  links?: string[];
  socialLinks?: SocialLinks;
  profilePublic?: boolean;
  emailVerifiedAt?: string | null;
  rating: number;
  totalChallengesSolved: number;
  totalBattlesWon: number;
  achievements: string[];
  roles: string[];
  createdAt: string;
  memberSince: string;
  rankProgress: RankProgress;
  globalRank?: number;
  countryRank?: number | null;
  xp?: number;
  rankTier?: string;
  currentStreak?: number;
  longestStreak?: number;
  totalActiveDays?: number;
  lastActiveAt?: string | null;
  activityHeatmap?: Array<{ date: string; count: number }>;
  dailyGoalTarget?: number;
  dailyGoalCompleted?: number;
  problemsByDifficulty?: ProblemsByDifficulty;
  acceptanceRate?: number;
  languageStats?: Record<string, number>;
  totalSubmissions?: number;
  totalAccepted?: number;
  battleLosses?: number;
  eloRating?: number;
  guildId?: string | null;
  codynCoins?: number;
  badgeIds?: string[];
}

export const RANK_TIER_COLORS: Record<string, string> = {
  F: 'from-gray-500 to-gray-700',
  E: 'from-stone-500 to-stone-700',
  D: 'from-amber-500 to-amber-700',
  C: 'from-sky-500 to-sky-700',
  B: 'from-emerald-500 to-emerald-700',
  A: 'from-violet-500 to-violet-700',
  S: 'from-yellow-400 to-amber-500',
};

export const BADGE_CATALOG: Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  requirement?: number;
}> = [
  { id: 'streak_7', name: 'Week Warrior', description: '7 day streak', category: 'Streak', icon: '🔥', requirement: 7 },
  { id: 'streak_30', name: 'Monthly Master', description: '30 day streak', category: 'Streak', icon: '📅', requirement: 30 },
  { id: 'streak_100', name: 'Century', description: '100 day streak', category: 'Streak', icon: '💯', requirement: 100 },
  { id: 'milestone_50', name: 'First 50', description: '50 problems solved', category: 'Milestone', icon: '🎯', requirement: 50 },
  { id: 'milestone_100', name: 'Centurion', description: '100 problems solved', category: 'Milestone', icon: '🏆', requirement: 100 },
  { id: 'milestone_500', name: 'Legend', description: '500 problems solved', category: 'Milestone', icon: '👑', requirement: 500 },
  { id: 'quality_week', name: 'Perfect Week', description: 'All submissions accepted in a week', category: 'Quality', icon: '✨' },
  { id: 'bug_hunter', name: 'Bug Hunter', description: 'Fixed 10 wrong answers', category: 'Quality', icon: '🐛' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Fastest solution in a challenge', category: 'Speed', icon: '⚡' },
  { id: 'contest_bronze', name: 'Bronze', description: 'Bronze in a contest', category: 'Contest', icon: '🥉' },
  { id: 'contest_silver', name: 'Silver', description: 'Silver in a contest', category: 'Contest', icon: '🥈' },
  { id: 'contest_gold', name: 'Gold', description: 'Gold in a contest', category: 'Contest', icon: '🥇' },
  { id: 'contest_platinum', name: 'Platinum', description: 'Platinum in a contest', category: 'Contest', icon: '💎' },
  { id: 'beta_tester', name: 'Beta Tester', description: 'Joined during beta', category: 'Special', icon: '🧪' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Early supporter', category: 'Special', icon: '🌟' },
  { id: 'algo_expert', name: 'Algorithm Expert', description: 'Mastered algorithms', category: 'Mastery', icon: '📐' },
  { id: 'ds_master', name: 'Data Structures Master', description: 'Mastered data structures', category: 'Mastery', icon: '🗂️' },
];
