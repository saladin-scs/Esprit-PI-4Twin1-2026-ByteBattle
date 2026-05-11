/**
 * ByteBattle Gamification - XP scale per action and constants.
 */

export const XP_BY_ACTION = {
  /** Solve a problem by difficulty */
  solveEasy: 50,
  solveMedium: 100,
  solveHard: 200,
  solveExpert: 300,
  /** Bonus solution parfaite (premier coup) */
  perfectSolveBonus: 25,
  /** First solution of the day */
  firstSolveOfDay: 50,
  /** Daily login */
  dailyLogin: 10,
  /** Streak bonus (per streak day) */
  streakBonusPerDay: 5,
  /** Participate in a contest */
  contestParticipate: 50,
  /** Win a contest */
  contestWin: 500,
  /** Helpful comment (limited to 5/day) */
  helpfulComment: 5,
} as const;

/** Daily limits (key = action, value = max per day) */
export const DAILY_LIMITS = {
  firstSolveOfDay: 1,
  dailyLogin: 1,
  helpfulComment: 5,
} as const;

export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

/** Rank tier thresholds (same as UsersService) for gamification updates */
export const RANK_XP: Record<string, number> = {
  F: 0,
  E: 100,
  D: 300,
  C: 600,
  B: 1000,
  A: 2000,
  S: 4000,
};
export const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;

export interface BadgeDefinition {
  id: string;
  name: string;
  condition: string;
  rarity: BadgeRarity;
  xpReward: number;
  /** Optional coins or freezes */
  coinsReward?: number;
  streakFreezes?: number;
}
