import { Injectable, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CompetitionsService } from '../competitions/competitions.service';
import { User } from '../users/schemas/user.schema';
import { SetupCache } from '../core/cache/setup-cache';

type LeaderboardPeriod = 'all-time' | 'monthly' | 'weekly';
type LeaderboardType = 'global' | 'speed' | 'code_golf' | 'algorithmic';
const LEADERBOARD_CACHE_TTL_SECONDS = 60;

interface LeaderboardEntry {
  rank: number;
  _id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  xp: number;
  rankTier: string;
  totalChallengesSolved: number;
  currentStreak: number;
  badgeIds?: string[];
  completions: number;
  wins: number;
  accuracy: number;
  favoriteLanguage?: string;
  stats?: {
    totalSubmissions: number;
    averageExecutionTime?: number;
    averageMemoryUsage?: number;
  };
}

interface LeaderboardResponse {
  period: LeaderboardPeriod;
  type: LeaderboardType;
  items: LeaderboardEntry[];
  page: number;
  limit: number;
  total: number;
  generatedAt: Date;
}

@Injectable()
export class LeaderboardService {
  private cacheKey = 'leaderboard:';

  constructor(
    private usersService: UsersService,
    private competitionsService: CompetitionsService,
    @InjectModel('User') private userModel: Model<User>,
    @Inject(SetupCache) private cacheService: SetupCache,
  ) {}

  /**
   * Get global leaderboard with rich statistics
   */
  async getGlobalLeaderboard(
    period: LeaderboardPeriod = 'all-time',
    type: LeaderboardType = 'global',
    limit: number = 100,
    page: number = 1,
    difficulty?: string,
  ): Promise<LeaderboardResponse> {
    const cacheKey = `${this.cacheKey}global:${period}:${type}:${difficulty || 'all'}:${page}:${limit}`;
    
    // Try cache
    try {
      const cached = await this.cacheService.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      // Continue without cache
    }

    const dateFilter = this.getDateFilter(period);
    const skip = (page - 1) * limit;

    // Build aggregation pipeline
    const pipeline: any[] = [
      {
        $match: {
          isActive: true,
          ...(dateFilter && { createdAt: dateFilter }),
        },
      },
      {
        $lookup: {
          from: 'challenges',
          localField: '_id',
          foreignField: 'submittedBy',
          as: 'submissions',
        },
      },
      {
        $lookup: {
          from: 'competitionsubmissions',
          localField: '_id',
          foreignField: 'userId',
          as: 'competitionSubs',
        },
      },
      {
        $addFields: {
          totalSubmissions: { $size: '$submissions' },
          totalCompetitionParticipations: { $size: '$competitionSubs' },
          wins: {
            $size: {
              $filter: {
                input: '$competitionSubs',
                as: 'sub',
                cond: { $eq: ['$$sub.rank', 1] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          accuracy: {
            $cond: [
              { $eq: ['$totalSubmissions', 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $size: {
                              $filter: {
                                input: '$submissions',
                                as: 'sub',
                                cond: { $eq: ['$$sub.status', 'accepted'] },
                              },
                            },
                          },
                          '$totalSubmissions',
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
        },
      },
      {
        $sort: { xp: -1, totalChallengesSolved: -1 },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                username: 1,
                displayName: 1,
                avatarUrl: 1,
                xp: 1,
                rankTier: 1,
                totalChallengesSolved: 1,
                currentStreak: 1,
                badgeIds: 1,
                completions: '$totalSubmissions',
                wins: 1,
                accuracy: 1,
                favoriteLanguage: null,
                stats: {
                  totalSubmissions: '$totalSubmissions',
                },
              },
            },
          ],
        },
      },
    ];

    const [result] = await this.userModel.aggregate(pipeline);
    const total = result.metadata[0]?.total || 0;

    // Add proper rank
    const items: LeaderboardEntry[] = result.items.map((item: any, index: number) => ({
      ...item,
      rank: skip + index + 1,
    }));

    const response: LeaderboardResponse = {
      period,
      type,
      items,
      page,
      limit,
      total,
      generatedAt: new Date(),
    };

    // Keep cache short so profile avatar updates appear quickly.
    try {
      await this.cacheService.set(cacheKey, JSON.stringify(response), LEADERBOARD_CACHE_TTL_SECONDS);
    } catch (err) {
      // Continue without cache
    }

    return response;
  }

  /**
   * Get user's rank and nearby users
   */
  async getUserRankContext(
    userId: string,
    period: LeaderboardPeriod = 'all-time',
    contextSize: number = 3,
  ) {
    const dateFilter = this.getDateFilter(period);

    const pipeline: any[] = [
      {
        $match: { isActive: true, ...(dateFilter && { createdAt: dateFilter }) },
      },
      {
        $sort: { xp: -1, totalChallengesSolved: -1 },
      },
      {
        $group: {
          _id: null,
          users: { $push: { _id: '$_id', xp: '$xp', totalChallengesSolved: '$totalChallengesSolved' } },
        },
      },
      {
        $project: {
          userIndex: {
            $indexOfArray: ['$users._id', userId],
          },
          users: 1,
        },
      },
    ];

    const [result] = await this.userModel.aggregate(pipeline);
    if (!result || result.userIndex === -1) {
      return null;
    }

    const startIdx = Math.max(0, result.userIndex - contextSize);
    const endIdx = Math.min(result.users.length, result.userIndex + contextSize + 1);
    const contextUsers = result.users.slice(startIdx, endIdx);

    return {
      yourRank: result.userIndex + 1,
      totalUsers: result.users.length,
      nearbyRanks: contextUsers.map((u: any, i: number) => ({
        rank: startIdx + i + 1,
        userId: u._id,
        isYou: u._id === userId,
        xp: u.xp,
      })),
    };
  }

  /**
   * Get competition-specific leaderboard
   */
  async getCompetitionLeaderboard(
    competitionId: string,
    language?: string,
    limit: number = 50,
    page: number = 1,
  ) {
    const skip = (page - 1) * limit;
    const pipeline: any[] = [
      {
        $match: { competitionId },
        ...( language && { $match: { language } }),
      },
      {
        $sort: { rank: 1, submittedAt: 1 },
      },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $lookup: {
                from: 'users',
                localField: 'userId',
                foreignField: '_id',
                as: 'user',
              },
            },
            {
              $unwind: '$user',
            },
            {
              $project: {
                rank: 1,
                userId: 1,
                username: '$user.username',
                displayName: '$user.displayName',
                avatarUrl: '$user.avatarUrl',
                language: 1,
                executionTime: 1,
                memoryUsage: 1,
                score: 1,
                submittedAt: 1,
              },
            },
          ],
        },
      },
    ];

    // Note: This will need the actual model collection name
    const [result] = await this.userModel.aggregate(pipeline);

    return {
      competitionId,
      language: language || 'all',
      items: result.items,
      total: result.metadata[0]?.total || 0,
      page,
      limit,
    };
  }

  /**
   * Get user detailed stats
   */
  async getUserDetailedStats(userId: string, _period: LeaderboardPeriod = 'all-time') {
    const user = await this.userModel.findById(userId);
    if (!user) return null;

    // Calculate stats from challenges and competitions
    const stats = {
      profile: {
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        xp: user.xp,
        rankTier: user.rankTier,
      },
      challenges: {
        total: user.totalChallengesSolved || 0,
        byDifficulty: {
          easy: 0,
          medium: 0,
          hard: 0,
          expert: 0,
        },
        byLanguage: {},
      },
      competitions: {
        participated: 0,
        wins: 0,
        topFinish: 0,
        favorite: '',
      },
      streak: {
        current: user.currentStreak || 0,
        longest: user.longestStreak || 0,
      },
    };

    return stats;
  }

  /**
   * Get trending/hot competitions (most participants)
   */
  async getTrendingCompetitions(limit: number = 5) {
    return this.competitionsService.findAll({
      limit,
      sortBy: 'submissions',
      sortOrder: 'desc',
    } as any); // Type casting for flexibility
  }

  /**
   * Get seasonal leaderboard (different periods)
   */
  async getSeasonalLeaderboards() {
    const periods: LeaderboardPeriod[] = ['weekly', 'monthly', 'all-time'];
    const results: Record<LeaderboardPeriod, any> = {} as any;

    for (const period of periods) {
      results[period] = await this.getGlobalLeaderboard(period, 'global', 10, 1);
    }

    return results;
  }

  private getDateFilter(period: LeaderboardPeriod) {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    switch (period) {
      case 'weekly':
        return { $gte: startOfWeek };
      case 'monthly':
        return { $gte: startOfMonth };
      case 'all-time':
      default:
        return null;
    }
  }
}

