/**
 * Catalogue des badges ByteBattle – conditions et récompenses.
 */
import type { BadgeDefinition } from './gamification.constants';

export const BADGES_STREAK: BadgeDefinition[] = [
  { id: 'streak_7', name: '🔥 Débutant Assidu', condition: '7 jours de streak', rarity: 'COMMON', xpReward: 50 },
  { id: 'streak_30', name: '⚡ Guerrier du Code', condition: '30 jours de streak', rarity: 'RARE', xpReward: 200, streakFreezes: 1 },
  { id: 'streak_100', name: '🏆 Légende Vivante', condition: '100 jours de streak', rarity: 'EPIC', xpReward: 500, streakFreezes: 3 },
  { id: 'streak_365', name: '👑 Immortel', condition: '1 an de streak', rarity: 'LEGENDARY', xpReward: 2000 },
  { id: 'streak_recovery', name: '🛡️ Phénix', condition: 'Récupérer un streak après l\'avoir perdu', rarity: 'RARE', xpReward: 100 },
];

export const BADGES_SOLVER: BadgeDefinition[] = [
  { id: 'solver_10', name: '🌱 Novice', condition: '10 problèmes résolus', rarity: 'COMMON', xpReward: 50 },
  { id: 'solver_50', name: '🌿 Apprenti', condition: '50 problèmes résolus', rarity: 'COMMON', xpReward: 100 },
  { id: 'solver_100', name: '🌳 Codeur', condition: '100 problèmes résolus', rarity: 'RARE', xpReward: 200 },
  { id: 'solver_250', name: '🏔️ Expert', condition: '250 problèmes résolus', rarity: 'RARE', xpReward: 500 },
  { id: 'solver_500', name: '🗻 Maître', condition: '500 problèmes résolus', rarity: 'EPIC', xpReward: 1000 },
  { id: 'solver_1000', name: '🏔️🏔️ Grand Maître', condition: '1000 problèmes résolus', rarity: 'LEGENDARY', xpReward: 2000 },
];

export const BADGES_DIFFICULTY: BadgeDefinition[] = [
  { id: 'easy_25', name: '📘 Chasseur de Facile', condition: '25 problèmes faciles', rarity: 'COMMON', xpReward: 50 },
  { id: 'easy_50', name: '📘 Expert en Facile', condition: '50 problèmes faciles', rarity: 'RARE', xpReward: 100 },
  { id: 'medium_25', name: '📙 Dompteur de Moyen', condition: '25 problèmes moyens', rarity: 'RARE', xpReward: 100 },
  { id: 'medium_50', name: '📙 Stratège', condition: '50 problèmes moyens', rarity: 'EPIC', xpReward: 250 },
  { id: 'hard_10', name: '📕 Brave', condition: '10 problèmes difficiles', rarity: 'EPIC', xpReward: 200 },
  { id: 'hard_25', name: '📕 Légende', condition: '25 problèmes difficiles', rarity: 'LEGENDARY', xpReward: 500 },
  { id: 'hard_50', name: '📕 Dieu du Code', condition: '50 problèmes difficiles', rarity: 'MYTHIC', xpReward: 1000 },
];

export const BADGES_QUALITY: BadgeDefinition[] = [
  { id: 'perfect_week', name: '💯 Semaine Parfaite', condition: '100% réussite pendant 7 jours', rarity: 'EPIC', xpReward: 300 },
  { id: 'first_blood', name: '🩸 First Blood', condition: 'Être le premier à résoudre un challenge', rarity: 'LEGENDARY', xpReward: 500, coinsReward: 100 },
  { id: 'optimal_solution', name: '⚡ Optimiseur', condition: 'Solution dans le top 5% en performance', rarity: 'EPIC', xpReward: 250 },
  { id: 'bug_hunter', name: '🐛 Chasseur de Bugs', condition: 'Trouver un bug dans un challenge', rarity: 'EPIC', xpReward: 300 },
  { id: 'perfect_score', name: '🎯 Sans Faute', condition: 'Résoudre un challenge du premier coup', rarity: 'RARE', xpReward: 150 },
];

export const BADGES_LANGUAGE: BadgeDefinition[] = [
  { id: 'python_master', name: '🐍 Maître Python', condition: '50 problèmes en Python', rarity: 'EPIC', xpReward: 200 },
  { id: 'js_master', name: '📘 Maître JavaScript', condition: '50 problèmes en JS', rarity: 'EPIC', xpReward: 200 },
  { id: 'java_master', name: '☕ Maître Java', condition: '50 problèmes en Java', rarity: 'EPIC', xpReward: 200 },
  { id: 'cpp_master', name: '⚙️ Maître C++', condition: '50 problèmes en C++', rarity: 'EPIC', xpReward: 200 },
  { id: 'polyglot', name: '🗣️ Polyglotte', condition: 'Résoudre en 5 langages différents', rarity: 'LEGENDARY', xpReward: 500 },
];

export const BADGES_CONTEST: BadgeDefinition[] = [
  { id: 'contest_first', name: '🥇 Champion', condition: '1ère place à un concours', rarity: 'LEGENDARY', xpReward: 500 },
  { id: 'contest_top10', name: '🎖️ Élite', condition: 'Top 10 dans un concours', rarity: 'EPIC', xpReward: 250 },
  { id: 'contest_top50', name: '🏅 Compétiteur', condition: 'Top 50 dans un concours', rarity: 'RARE', xpReward: 100 },
  { id: 'contest_veteran', name: '⚔️ Vétéran', condition: 'Participer à 10 concours', rarity: 'RARE', xpReward: 100 },
];

export const BADGES_SOCIAL: BadgeDefinition[] = [
  { id: 'helper', name: '🤝 Entraide', condition: '10 solutions utiles (upvotes)', rarity: 'RARE', xpReward: 100 },
  { id: 'mentor', name: '👨‍🏫 Mentor', condition: '50 upvotes sur commentaires', rarity: 'EPIC', xpReward: 250 },
  { id: 'popular', name: '🌟 Influenceur', condition: '100 followers', rarity: 'EPIC', xpReward: 250 },
  { id: 'ambassador', name: '🎙️ Ambassadeur', condition: '5 amis référés', rarity: 'RARE', xpReward: 150 },
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
