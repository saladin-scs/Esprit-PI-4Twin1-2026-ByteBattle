/**
 * ByteBattle Gamification – Barème XP par action et constantes.
 */

export const XP_BY_ACTION = {
  /** Résoudre un problème par difficulté */
  solveEasy: 50,
  solveMedium: 100,
  solveHard: 200,
  solveExpert: 300,
  /** Bonus solution parfaite (premier coup) */
  perfectSolveBonus: 25,
  /** Première solution du jour */
  firstSolveOfDay: 50,
  /** Connexion quotidienne */
  dailyLogin: 10,
  /** Bonus de streak (par jour de streak) */
  streakBonusPerDay: 5,
  /** Participer à un concours */
  contestParticipate: 50,
  /** Gagner un concours */
  contestWin: 500,
  /** Commentaire utile (limité 5x/jour) */
  helpfulComment: 5,
} as const;

/** Limites quotidiennes (clé = action, valeur = max par jour) */
export const DAILY_LIMITS = {
  firstSolveOfDay: 1,
  dailyLogin: 1,
  helpfulComment: 5,
} as const;

export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

/** Rank tier thresholds (same as UsersService) for gamification updates */
export const RANK_XP: Record<string, number> = { F: 0, E: 100, D: 300, C: 600, B: 1000, A: 2000, S: 4000 };
export const RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;

export interface BadgeDefinition {
  id: string;
  name: string;
  condition: string;
  rarity: BadgeRarity;
  xpReward: number;
  /** Coins ou freezes optionnels */
  coinsReward?: number;
  streakFreezes?: number;
}
