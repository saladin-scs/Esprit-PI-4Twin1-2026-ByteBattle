/**
 * Shared types for the Competitions module.
 */

export type CompetitionType = 'code_golf' | 'speed' | 'algorithmic';
export type CompetitionStatus = 'scheduled' | 'active' | 'closed' | 'archived';

export interface CompetitionChallengeSummary {
  _id: string;
  title: string;
  description: string;
  difficulty: string;
  languages: string[];
  examples: Array<{ input: string; output: string; explanation?: string }>;
  starterCode: Record<string, string>;
}

export interface CompetitionListItem {
  _id: string;
  name: string;
  description: string;
  type: CompetitionType;
  status: CompetitionStatus;
  startTime: string;
  endTime: string;
  supportedLanguages: string[];
  participants?: string[];
  totalSubmissions?: number;
  challengeIds: string[];
  prizes?: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
}

export interface CompetitionDetail extends CompetitionListItem {
  rules?: string;
  challenges?: CompetitionChallengeSummary[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username?: string;
  score: number;
  executionTimeMs: number;
  language: string;
  submittedAt: string;
}

export interface SubmitResult {
  status: string;
  passedTests: number;
  totalTests: number;
  score: number;
  executionTimeMs: number;
  isBest: boolean;
}

export type CompetitionTab = 'active' | 'scheduled' | 'past';

export const COMPETITION_TAB_STATUS: Record<CompetitionTab, CompetitionStatus | undefined> = {
  active: 'active',
  scheduled: 'scheduled',
  past: 'closed',
};

export const COMPETITION_TYPE_CONFIG: Record<
  CompetitionType,
  { label: string; shortLabel: string; scoreUnit: string; icon: string }
> = {
  code_golf: { label: 'Code Golf', shortLabel: 'Code Golf', scoreUnit: 'bytes', icon: '⛳' },
  speed: { label: 'Speed Challenge', shortLabel: 'Speed', scoreUnit: 'ms', icon: '⚡' },
  algorithmic: { label: 'Algorithmic', shortLabel: 'Algorithmic', scoreUnit: 'pts', icon: '📊' },
};
