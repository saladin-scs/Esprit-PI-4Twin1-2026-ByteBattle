/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  XP_BY_ACTION,
  DAILY_LIMITS,
  RANK_XP,
  RANK_ORDER,
} from './gamification.constants';
import {
  ALL_BADGES,
  BADGE_MAP,
  BADGES_STREAK,
  BADGES_SOLVER,
  BADGES_DIFFICULTY,
  BADGES_QUALITY,
  BADGES_LANGUAGE,
  BADGES_CONTEST,
} from './badges.config';
import { NotificationsService } from '../notifications/notifications.service';

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

@Injectable()
export class GamificationService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private todayUtc(): string {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  }

  private getRankTierFromXp(xp: number): string {
    let tier = 'F';
    for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
      const t = RANK_ORDER[i];
      if (xp >= (RANK_XP[t] ?? 0)) {
        tier = t;
        break;
      }
    }
    return tier;
  }

  /** Records daily login: XP + streak + streak badges */
  async recordDailyLogin(userId: string): Promise<{ xpAwarded: number; streak: number }> {
    const user = await this.userModel.findById(userId).select(
      'xp lastActiveAt lastDailyLoginDate currentStreak longestStreak totalActiveDays streakFreezes badgeIds hasRecoveredStreak',
    ).lean().exec();
    if (!user) throw new NotFoundException('User not found');

    const u = user as any;
    const today = this.todayUtc();
    let xpAwarded = 0;
    let newStreak = u.currentStreak ?? 0;
    let updateStreakRecovered = false;
    const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
    const lastActiveDate = lastActive ? lastActive.toISOString().slice(0, 10) : null;
    const lastLoginDate = u.lastDailyLoginDate ?? null;

    // Daily login XP (1x per day)
    const previousStreak = u.currentStreak ?? 0;
    if (lastLoginDate !== today) {
      xpAwarded += XP_BY_ACTION.dailyLogin;
      const daysSinceActive = lastActiveDate
        ? Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000))
        : 999;
      if (daysSinceActive === 0) {
        // already active today, no streak change
      } else if (daysSinceActive === 1) {
        newStreak = previousStreak + 1;
      } else {
        newStreak = 1;
        if (previousStreak > 0) {
          updateStreakRecovered = true;
        }
      }
    }

    const longestStreak = Math.max(u.longestStreak ?? 0, newStreak);

    const update: any = {
      lastActiveAt: new Date(),
      lastDailyLoginDate: today,
      currentStreak: newStreak,
      longestStreak,
    };
    if (updateStreakRecovered) update.hasRecoveredStreak = true;
    const inc: Record<string, number> = {};
    if (lastLoginDate !== today) inc.totalActiveDays = 1;
    if (xpAwarded > 0) {
      const currentXp = (u.xp ?? 0) + xpAwarded;
      const streakBonus = Math.min(newStreak * XP_BY_ACTION.streakBonusPerDay, 100);
      const totalXp = currentXp + streakBonus;
      inc.xp = xpAwarded + streakBonus;
      update.rankTier = this.getRankTierFromXp(totalXp);
    }
    if (Object.keys(inc).length) update.$inc = inc;

    await this.userModel.findByIdAndUpdate(userId, update).exec();

    if (xpAwarded > 0) {
      await this.checkAndAwardBadges(userId, 'streak');
    }

    return { xpAwarded: xpAwarded + (xpAwarded > 0 ? Math.min(newStreak * XP_BY_ACTION.streakBonusPerDay, 100) : 0), streak: newStreak };
  }

  /**
   * Records a solved problem: XP (base + first-try bonus + first-of-day),
   * updates problemsByDifficulty, languageStats, streaks, and checks badges.
   */
  async recordChallengeSolved(
    userId: string,
    opts: {
      difficulty: Difficulty;
      language: string;
      isFirstTry: boolean;
      isFirstSolver: boolean;
      challengeId: string;
      /** 0–1, applied to the full XP bundle (base + bonuses) before flat penalty */
      xpTimeMultiplier?: number;
      /** Subtracted after scaling (e.g. sum of hint costs) */
      xpFlatPenalty?: number;
    },
  ): Promise<{ xpEarned: number; badgesUnlocked: string[] }> {
    const user = await this.userModel.findById(userId).select(
      'xp totalChallengesSolved problemsByDifficulty languageStats lastFirstSolveOfDayDate badgeIds lastActiveAt currentStreak longestStreak totalActiveDays lastDailyLoginDate',
    ).lean().exec();
    if (!user) throw new NotFoundException('User not found');

    const u = user as any;
    const today = this.todayUtc();
    const baseXp =
      opts.difficulty === 'easy' ? XP_BY_ACTION.solveEasy
        : opts.difficulty === 'medium' ? XP_BY_ACTION.solveMedium
          : opts.difficulty === 'hard' ? XP_BY_ACTION.solveHard
            : XP_BY_ACTION.solveExpert;

    let xpEarned: number = baseXp;
    if (opts.isFirstTry) xpEarned += XP_BY_ACTION.perfectSolveBonus;
    const firstSolveOfDay = u.lastFirstSolveOfDayDate !== today;
    if (firstSolveOfDay) xpEarned += XP_BY_ACTION.firstSolveOfDay;

    const timeMult = Math.min(1, Math.max(0, opts.xpTimeMultiplier ?? 1));
    const flatPenalty = Math.max(0, Math.floor(opts.xpFlatPenalty ?? 0));
    xpEarned = Math.max(0, Math.floor(xpEarned * timeMult) - flatPenalty);

    const problemsByDifficulty = { ...(u.problemsByDifficulty || { easy: 0, medium: 0, hard: 0, expert: 0 }) };
    const lang = (opts.language || 'javascript').toLowerCase().replace('c++', 'cpp');
    problemsByDifficulty[opts.difficulty as keyof typeof problemsByDifficulty] =
      (problemsByDifficulty[opts.difficulty as keyof typeof problemsByDifficulty] ?? 0) + 1;
    const languageStats = { ...(u.languageStats || {}) };
    languageStats[lang] = (languageStats[lang] ?? 0) + 1;

    const lastActive = u.lastActiveAt ? new Date(u.lastActiveAt) : null;
    const lastActiveDate = lastActive ? lastActive.toISOString().slice(0, 10) : null;
    const daysSinceActive = lastActiveDate
      ? Math.floor((Date.now() - (lastActive?.getTime() ?? 0)) / (24 * 60 * 60 * 1000))
      : 999;
    let newStreak = u.currentStreak ?? 0;
    if (daysSinceActive === 0) {
      // same day, keep streak
    } else if (daysSinceActive === 1) {
      newStreak = newStreak + 1;
    } else {
      newStreak = 1;
    }
    const longestStreak = Math.max(u.longestStreak ?? 0, newStreak);

    const newXp = (u.xp ?? 0) + xpEarned;
    const rankTier = this.getRankTierFromXp(newXp);

    // Two updates to avoid MongoDB conflict: cannot mix $inc on nested paths with $set on parent
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { xp: xpEarned, totalChallengesSolved: 1 },
      $set: {
        rankTier,
        lastActiveAt: new Date(),
        currentStreak: newStreak,
        longestStreak,
        ...(firstSolveOfDay ? { lastFirstSolveOfDayDate: today } : {}),
      },
    }).exec();
    await this.userModel.findByIdAndUpdate(userId, {
      $set: {
        problemsByDifficulty: { ...problemsByDifficulty },
        languageStats: { ...languageStats },
      },
    }).exec();

    const badgesUnlocked: string[] = [];
    if (opts.isFirstTry) {
      const badge = BADGE_MAP.get('perfect_score');
      if (badge && !(u.badgeIds || []).includes('perfect_score')) {
        await this.awardBadge(userId, badge);
        badgesUnlocked.push(badge.name);
      }
    }
    if (opts.isFirstSolver) {
      const badge = BADGE_MAP.get('first_blood');
      if (badge && !(u.badgeIds || []).includes('first_blood')) {
        await this.awardBadge(userId, badge);
        badgesUnlocked.push(badge.name);
      }
    }
    const more = await this.checkAndAwardBadges(userId, 'all');
    badgesUnlocked.push(...more);
    return { xpEarned, badgesUnlocked };
  }

  /**
   * Checks and unlocks eligible badges.
   * category: 'streak' | 'solver' | 'difficulty' | 'quality' | 'language' | 'all'
   */
  async checkAndAwardBadges(userId: string, category: 'streak' | 'solver' | 'difficulty' | 'quality' | 'language' | 'all' = 'all'): Promise<string[]> {
    const user = await this.userModel.findById(userId).select(
      'badgeIds xp currentStreak longestStreak totalChallengesSolved problemsByDifficulty languageStats hasRecoveredStreak competitionsParticipated',
    ).lean().exec();
    if (!user) return [];

    const u = user as any;
    const unlocked = u.badgeIds || [];
    const newlyUnlocked: string[] = [];

    const check = async (badgeIds: string[]): Promise<void> => {
      for (const bid of badgeIds) {
        if (unlocked.includes(bid)) continue;
        const badge = BADGE_MAP.get(bid);
        if (!badge) continue;
        const ok = await this.checkBadgeCondition(userId, bid, u);
        if (ok) {
          await this.awardBadge(userId, badge);
          newlyUnlocked.push(badge.name);
        }
      }
    };

    if (category === 'streak' || category === 'all') await check(BADGES_STREAK.map((b) => b.id));
    if (category === 'solver' || category === 'all') await check(BADGES_SOLVER.map((b) => b.id));
    if (category === 'difficulty' || category === 'all') await check(BADGES_DIFFICULTY.map((b) => b.id));
    if (category === 'quality' || category === 'all') await check(BADGES_QUALITY.map((b) => b.id));
    if (category === 'language' || category === 'all') await check(BADGES_LANGUAGE.map((b) => b.id));
    if (category === 'all') await check(BADGES_CONTEST.map((b) => b.id));

    return newlyUnlocked;
  }

  private async checkBadgeCondition(userId: string, badgeId: string, u: any): Promise<boolean> {
    const total = u.totalChallengesSolved ?? 0;
    const pd = u.problemsByDifficulty || {};
    const streak = u.currentStreak ?? 0;
    const langStats = u.languageStats || {};
    const langCount = Object.keys(langStats).length;
    const hasRecovered = u.hasRecoveredStreak === true;
    const competitionsParticipated = u.competitionsParticipated ?? 0;

    switch (badgeId) {
      case 'streak_7': return streak >= 7;
      case 'streak_30': return streak >= 30;
      case 'streak_100': return streak >= 100;
      case 'streak_365': return streak >= 365;
      case 'streak_recovery': return hasRecovered;
      case 'solver_10': return total >= 10;
      case 'solver_50': return total >= 50;
      case 'solver_100': return total >= 100;
      case 'solver_250': return total >= 250;
      case 'solver_500': return total >= 500;
      case 'solver_1000': return total >= 1000;
      case 'easy_25': return (pd.easy ?? 0) >= 25;
      case 'easy_50': return (pd.easy ?? 0) >= 50;
      case 'medium_25': return (pd.medium ?? 0) >= 25;
      case 'medium_50': return (pd.medium ?? 0) >= 50;
      case 'hard_10': return (pd.hard ?? 0) >= 10;
      case 'hard_25': return (pd.hard ?? 0) >= 25;
      case 'hard_50': return (pd.hard ?? 0) >= 50;
      case 'python_master': return (langStats.python ?? 0) >= 50;
      case 'js_master': return (langStats.javascript ?? 0) >= 50;
      case 'java_master': return (langStats.java ?? 0) >= 50;
      case 'cpp_master': return (langStats.cpp ?? 0) >= 50;
      case 'polyglot': return langCount >= 5;
      case 'contest_veteran': return competitionsParticipated >= 10;
      default: return false;
    }
  }

  /** Award participation XP and increment competitionsParticipated. Call when user first submits to a competition. */
  async recordCompetitionParticipated(userId: string): Promise<{ xpAwarded: number }> {
    const user = await this.userModel.findById(userId).select('xp competitionsParticipated').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    const u = user as any;
    const current = u.competitionsParticipated ?? 0;
    const xpAwarded = XP_BY_ACTION.contestParticipate;
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { xp: xpAwarded, competitionsParticipated: 1 },
      $set: { rankTier: this.getRankTierFromXp((u.xp ?? 0) + xpAwarded) },
    }).exec();
    await this.checkAndAwardBadges(userId, 'all');
    return { xpAwarded };
  }

  /** Award placement XP and contest badges. Call when a competition is finalized (e.g. status → closed). */
  async recordCompetitionResult(
    userId: string,
    opts: { competitionId: string; rank: number; totalParticipants: number },
  ): Promise<{ xpAwarded: number; badgesUnlocked: string[] }> {
    const user = await this.userModel.findById(userId).select('xp badgeIds').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    const u = user as any;
    const unlocked = u.badgeIds || [];
    let xpAwarded = 0;
    const badgesUnlocked: string[] = [];

    if (opts.rank === 1) {
      xpAwarded += XP_BY_ACTION.contestWin;
      const badge = BADGE_MAP.get('contest_first');
      if (badge && !unlocked.includes('contest_first')) {
        await this.awardBadge(userId, badge);
        badgesUnlocked.push(badge.name);
      }
    }
    if (opts.rank <= 10) {
      const badge = BADGE_MAP.get('contest_top10');
      if (badge && !unlocked.includes('contest_top10')) {
        await this.awardBadge(userId, badge);
        badgesUnlocked.push(badge.name);
      }
    }
    if (opts.rank <= 50) {
      const badge = BADGE_MAP.get('contest_top50');
      if (badge && !unlocked.includes('contest_top50')) {
        await this.awardBadge(userId, badge);
        badgesUnlocked.push(badge.name);
      }
    }

    if (xpAwarded > 0) {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { xp: xpAwarded },
        $set: { rankTier: this.getRankTierFromXp((u.xp ?? 0) + xpAwarded) },
      }).exec();
    }
    return { xpAwarded, badgesUnlocked };
  }

  private async awardBadge(userId: string, badge: { id: string; name: string; xpReward: number; coinsReward?: number; streakFreezes?: number }): Promise<void> {
    const user = await this.userModel.findById(userId).select('xp').lean().exec();
    if (!user) return;
    const newXp = (user as any).xp + badge.xpReward;
    const rankTier = this.getRankTierFromXp(newXp);
    const inc: Record<string, number> = { xp: badge.xpReward };
    if (badge.coinsReward) inc.codynCoins = badge.coinsReward;
    if (badge.streakFreezes) inc.streakFreezes = badge.streakFreezes;
    await this.userModel.findByIdAndUpdate(userId, {
      $addToSet: { badgeIds: badge.id },
      lastUnlockedBadge: { badgeId: badge.id, name: badge.name },
      $inc: inc,
      rankTier,
    }).exec();

    await this.pushRecentActivity(userId, 'badge_unlocked', { badgeId: badge.id, name: badge.name });

    void this.notificationsService
      .create({
        userId,
        type: 'badge_unlocked',
        title: 'Badge unlocked',
        body: `You unlocked the badge "${badge.name}"${badge.xpReward ? ` (+${badge.xpReward} XP)` : ''}.`,
        meta: { href: '/dashboard' },
      })
      .catch(() => undefined);
  }

  private async pushRecentActivity(userId: string, type: string, metadata?: Record<string, any>): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $push: {
        recentActivity: {
          $each: [{ type, date: new Date(), success: true, metadata: metadata || {} }],
          $slice: -100,
        },
      },
    }).exec();
  }

  /** Use a streak freeze to avoid losing streak (e.g. day without login). */
  async useStreakFreeze(userId: string): Promise<{ success: boolean; remainingFreezes: number }> {
    const user = await this.userModel.findById(userId).select('streakFreezes currentStreak').exec();
    if (!user) throw new NotFoundException('User not found');
    const freezes = (user as any).streakFreezes ?? 0;
    if (freezes < 1) return { success: false, remainingFreezes: 0 };
    await this.userModel.findByIdAndUpdate(userId, { $inc: { streakFreezes: -1 } }).exec();
    return { success: true, remainingFreezes: freezes - 1 };
  }

  /** Mark streak recovery (for Phoenix badge). */
  async markStreakRecovered(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { hasRecoveredStreak: true }).exec();
  }

  /** Get badge catalog and XP constants for frontend. */
  getCatalog() {
    return {
      badges: ALL_BADGES,
      xpByAction: XP_BY_ACTION,
      dailyLimits: DAILY_LIMITS,
    };
  }

  /** Gamification summary of logged-in user (includes progress to next rank and leaderboard rank). */
  async getMySummary(userId: string) {
    const user = await this.userModel.findById(userId).select(
      'username xp rankTier currentStreak longestStreak totalActiveDays streakFreezes totalChallengesSolved problemsByDifficulty languageStats badgeIds lastUnlockedBadge lastDailyLoginDate lastFirstSolveOfDayDate',
    ).lean().exec();
    if (!user) throw new NotFoundException('User not found');
    const u = user as any;
    const today = this.todayUtc();
    const xp = u.xp ?? 0;
    const rankTier = u.rankTier ?? this.getRankTierFromXp(xp);
    const rankProgress = this.getRankProgress(xp, rankTier);
    const [usersAbove, totalRanked] = await Promise.all([
      this.userModel.countDocuments({ xp: { $gt: xp } }).exec(),
      this.userModel.countDocuments({}).exec(),
    ]);
    const myRank = totalRanked > 0 ? usersAbove + 1 : 0;
    return {
      xp,
      rankTier,
      rankProgress,
      currentStreak: u.currentStreak ?? 0,
      longestStreak: u.longestStreak ?? 0,
      totalActiveDays: u.totalActiveDays ?? 0,
      streakFreezes: u.streakFreezes ?? 0,
      totalChallengesSolved: u.totalChallengesSolved ?? 0,
      problemsByDifficulty: u.problemsByDifficulty ?? { easy: 0, medium: 0, hard: 0, expert: 0 },
      languageStats: u.languageStats ?? {},
      badgeIds: u.badgeIds ?? [],
      lastUnlockedBadge: u.lastUnlockedBadge ?? null,
      canClaimDailyLogin: u.lastDailyLoginDate !== today,
      canClaimFirstSolveOfDay: u.lastFirstSolveOfDayDate !== today,
      myRank: totalRanked > 0 ? myRank : null,
      totalRanked,
      username: u.username,
    };
  }

  /** Progress to next rank for UI (progress bar). */
  private getRankProgress(xp: number, currentTier: string): { currentTier: string; nextTier: string | null; xpInTier: number; xpNeededForNext: number; progressFraction: number } {
    const idx = RANK_ORDER.indexOf(currentTier as any);
    const currentThreshold = RANK_XP[currentTier] ?? 0;
    const xpInTier = Math.max(0, xp - currentThreshold);
    if (idx < 0 || idx >= RANK_ORDER.length - 1) {
      return { currentTier, nextTier: null, xpInTier, xpNeededForNext: 0, progressFraction: 1 };
    }
    const nextTier = RANK_ORDER[idx + 1];
    const nextThreshold = RANK_XP[nextTier] ?? currentThreshold;
    const xpNeededForNext = nextThreshold - xp;
    const tierSpan = nextThreshold - currentThreshold;
    const progressFraction = tierSpan > 0 ? Math.min(1, (xp - currentThreshold) / tierSpan) : 1;
    return { currentTier, nextTier, xpInTier, xpNeededForNext: Math.max(0, xpNeededForNext), progressFraction };
  }

  /** Classement global par XP */
  async getLeaderboard(params: { page?: number; limit?: number; country?: string }) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (params.country) filter.country = params.country;
    const items = await this.userModel
      .find(filter)
      .select('username displayName avatarUrl xp rankTier totalChallengesSolved currentStreak badgeIds')
      .sort({ xp: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();
    const total = await this.userModel.countDocuments(filter).exec();
    return { items, page, limit, total };
  }
}
