/**
 * ByteBattle badges catalog - conditions and rewards.
 */
import type { BadgeDefinition } from './gamification.constants';

export const BADGES_STREAK: BadgeDefinition[] = [
  { id: 'streak_7', name: '🔥 Consistent Beginner', condition: '7-day streak', rarity: 'COMMON', xpReward: 50 },
  { id: 'streak_30', name: '⚡ Code Warrior', condition: '30-day streak', rarity: 'RARE', xpReward: 200, streakFreezes: 1 },
  { id: 'streak_100', name: '🏆 Living Legend', condition: '100-day streak', rarity: 'EPIC', xpReward: 500, streakFreezes: 3 },
  { id: 'streak_365', name: '👑 Immortal', condition: '1-year streak', rarity: 'LEGENDARY', xpReward: 2000 },
  { id: 'streak_recovery', name: '🛡️ Phoenix', condition: 'Recover a streak after losing it', rarity: 'RARE', xpReward: 100 },
];

export const BADGES_SOLVER: BadgeDefinition[] = [
  { id: 'solver_10', name: '🌱 Novice', condition: 'Solve 10 problems', rarity: 'COMMON', xpReward: 50 },
  { id: 'solver_50', name: '🌿 Apprentice', condition: 'Solve 50 problems', rarity: 'COMMON', xpReward: 100 },
  { id: 'solver_100', name: '🌳 Coder', condition: 'Solve 100 problems', rarity: 'RARE', xpReward: 200 },
  { id: 'solver_250', name: '🏔️ Expert', condition: 'Solve 250 problems', rarity: 'RARE', xpReward: 500 },
  { id: 'solver_500', name: '🗻 Master', condition: 'Solve 500 problems', rarity: 'EPIC', xpReward: 1000 },
  { id: 'solver_1000', name: '🏔️🏔️ Grand Master', condition: 'Solve 1000 problems', rarity: 'LEGENDARY', xpReward: 2000 },
];

export const BADGES_DIFFICULTY: BadgeDefinition[] = [
  { id: 'easy_25', name: '📘 Easy Hunter', condition: 'Solve 25 easy problems', rarity: 'COMMON', xpReward: 50 },
  { id: 'easy_50', name: '📘 Easy Expert', condition: 'Solve 50 easy problems', rarity: 'RARE', xpReward: 100 },
  { id: 'medium_25', name: '📙 Medium Tamer', condition: 'Solve 25 medium problems', rarity: 'RARE', xpReward: 100 },
  { id: 'medium_50', name: '📙 Strategist', condition: 'Solve 50 medium problems', rarity: 'EPIC', xpReward: 250 },
  { id: 'hard_10', name: '📕 Brave', condition: 'Solve 10 hard problems', rarity: 'EPIC', xpReward: 200 },
  { id: 'hard_25', name: '📕 Legend', condition: 'Solve 25 hard problems', rarity: 'LEGENDARY', xpReward: 500 },
  { id: 'hard_50', name: '📕 Code Deity', condition: 'Solve 50 hard problems', rarity: 'MYTHIC', xpReward: 1000 },
];

export const BADGES_QUALITY: BadgeDefinition[] = [
  { id: 'perfect_week', name: '💯 Perfect Week', condition: '100% success rate for 7 days', rarity: 'EPIC', xpReward: 300 },
  { id: 'first_blood', name: '🩸 First Blood', condition: 'Be first to solve a challenge', rarity: 'LEGENDARY', xpReward: 500, coinsReward: 100 },
  { id: 'optimal_solution', name: '⚡ Optimizer', condition: 'Top 5% performance solution', rarity: 'EPIC', xpReward: 250 },
  { id: 'bug_hunter', name: '🐛 Bug Hunter', condition: 'Find a bug in a challenge', rarity: 'EPIC', xpReward: 300 },
  { id: 'perfect_score', name: '🎯 Flawless', condition: 'Solve a challenge on first try', rarity: 'RARE', xpReward: 150 },
];

export const BADGES_LANGUAGE: BadgeDefinition[] = [
  { id: 'python_master', name: '🐍 Python Master', condition: 'Solve 50 problems in Python', rarity: 'EPIC', xpReward: 200 },
  { id: 'js_master', name: '📘 JavaScript Master', condition: 'Solve 50 problems in JS', rarity: 'EPIC', xpReward: 200 },
  { id: 'java_master', name: '☕ Java Master', condition: 'Solve 50 problems in Java', rarity: 'EPIC', xpReward: 200 },
  { id: 'cpp_master', name: '⚙️ C++ Master', condition: 'Solve 50 problems in C++', rarity: 'EPIC', xpReward: 200 },
  { id: 'polyglot', name: '🗣️ Polyglot', condition: 'Solve in 5 different languages', rarity: 'LEGENDARY', xpReward: 500 },
];

export const BADGES_CONTEST: BadgeDefinition[] = [
  { id: 'contest_first', name: '🥇 Champion', condition: 'Finish 1st in a contest', rarity: 'LEGENDARY', xpReward: 500 },
  { id: 'contest_top10', name: '🎖️ Elite', condition: 'Top 10 in a contest', rarity: 'EPIC', xpReward: 250 },
  { id: 'contest_top50', name: '🏅 Competitor', condition: 'Top 50 in a contest', rarity: 'RARE', xpReward: 100 },
  { id: 'contest_veteran', name: '⚔️ Veteran', condition: 'Participate in 10 contests', rarity: 'RARE', xpReward: 100 },
];

export const BADGES_SOCIAL: BadgeDefinition[] = [
  { id: 'helper', name: '🤝 Helper', condition: '10 useful solutions (upvotes)', rarity: 'RARE', xpReward: 100 },
  { id: 'mentor', name: '👨‍🏫 Mentor', condition: '50 comment upvotes', rarity: 'EPIC', xpReward: 250 },
  { id: 'popular', name: '🌟 Influencer', condition: '100 followers', rarity: 'EPIC', xpReward: 250 },
  { id: 'ambassador', name: '🎙️ Ambassador', condition: 'Refer 5 friends', rarity: 'RARE', xpReward: 150 },
];

export const ALL_BADGES: BadgeDefinition[] = [
  ...BADGES_STREAK,
  ...BADGES_SOLVER,
  ...BADGES_DIFFICULTY,
  ...BADGES_QUALITY,
  ...BADGES_LANGUAGE,
  ...BADGES_CONTEST,
  ...BADGES_SOCIAL,
];

export const BADGE_MAP = new Map(ALL_BADGES.map((b) => [b.id, b]));
