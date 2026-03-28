import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Challenge, ChallengeDocument } from '../challenges/schemas/challenge.schema';
import { Competition, CompetitionDocument } from '../competitions/schemas/competition.schema';
import {
  CompetitionSubmission,
  CompetitionSubmissionDocument,
} from '../competitions/schemas/competition-submission.schema';
import { Submission, SubmissionDocument } from '../challenges/schemas/Submission.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Challenge.name)
    private readonly challengeModel: Model<ChallengeDocument>,
    @InjectModel(Competition.name)
    private readonly competitionModel: Model<CompetitionDocument>,
    @InjectModel(CompetitionSubmission.name)
    private readonly competitionSubmissionModel: Model<CompetitionSubmissionDocument>,
    @InjectModel(Submission.name)
    private readonly challengeSubmissionModel: Model<SubmissionDocument>,
  ) {}

  async listUsers(params: {
    page?: number;
    limit?: number;
    q?: string;
    role?: string;
    isActive?: boolean;
    emailVerified?: boolean;
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit || 20)));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (typeof params.isActive === 'boolean') filter.isActive = params.isActive;
    if (typeof params.emailVerified === 'boolean') {
      filter.emailVerifiedAt = params.emailVerified ? { $ne: null } : null;
    }
    if (params.role) {
      filter.$or = [
        { roles: params.role },
        ...(params.role === 'admin' ? [{ isAdmin: true }] : []),
      ];
    }
    if (params.q) {
      const q = String(params.q).trim();
      if (q) {
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { displayName: { $regex: q, $options: 'i' } },
          ],
        });
      }
    }

    const [items, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('email username displayName roles isAdmin isActive emailVerifiedAt createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return { items, page, limit, total };
  }

  async updateUser(
    userId: string,
    update: { roles?: string[]; isActive?: boolean },
    currentAdminId?: string,
  ) {
    // Prevent admin from demoting or deactivating themselves
    if (currentAdminId && String(userId) === String(currentAdminId)) {
      if (Array.isArray(update.roles) && !update.roles.includes('admin')) {
        throw new ForbiddenException('You cannot remove your own admin role');
      }
      if (update.isActive === false) {
        throw new ForbiddenException('You cannot deactivate your own account');
      }
    }

    const set: any = {};
    if (Array.isArray(update.roles)) {
      const roles = update.roles.length ? update.roles : ['user'];
      set.roles = roles;
      set.isAdmin = roles.includes('admin');
    }
    if (typeof update.isActive === 'boolean') set.isActive = update.isActive;

    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: set }, { new: true })
      .select('email username displayName roles isAdmin isActive emailVerifiedAt createdAt')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Change the role of a user (e.g. promote to admin). */
  async setUserRole(
    userId: string,
    role: 'user' | 'moderator' | 'admin',
    currentAdminId?: string,
  ) {
    if (currentAdminId && String(userId) === String(currentAdminId)) {
      if (role !== 'admin') {
        throw new ForbiddenException('You cannot remove your own admin role');
      }
    }

    const roles = [role];
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $set: { roles, isAdmin: role === 'admin' } },
        { new: true },
      )
      .select('email username displayName roles isAdmin isActive emailVerifiedAt createdAt')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /** Stats gamification pour l’interface admin */
  async getGamificationStats() {
    const [totalUsers, usersWithBadges, xpAgg, badgeCounts] = await Promise.all([
      this.userModel.countDocuments().exec(),
      this.userModel.countDocuments({ badgeIds: { $exists: true, $ne: [] } }).exec(),
      this.userModel.aggregate([{ $group: { _id: null, avgXp: { $avg: '$xp' }, maxXp: { $max: '$xp' } } }]).exec(),
      this.userModel.aggregate([
        { $unwind: '$badgeIds' },
        { $group: { _id: '$badgeIds', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).exec(),
    ]);
    const avgXp = xpAgg[0]?.avgXp ?? 0;
    const maxXp = xpAgg[0]?.maxXp ?? 0;
    return {
      totalUsers,
      usersWithBadges,
      averageXp: Math.round(avgXp),
      maxXp,
      topBadges: badgeCounts.map((b: any) => ({ badgeId: b._id, count: b.count })),
    };
  }

  /** Single payload for MUI admin dashboard home */
  async getDashboardOverview() {
    const gamification = await this.getGamificationStats();
    const [
      challengesPublished,
      challengesTotal,
      competitionsTotal,
      competitionsActive,
      competitionSubmissionsTotal,
      challengeSubmissionsTotal,
    ] = await Promise.all([
      this.challengeModel.countDocuments({ isPublished: true }).exec(),
      this.challengeModel.countDocuments().exec(),
      this.competitionModel.countDocuments().exec(),
      this.competitionModel.countDocuments({ status: 'active' }).exec(),
      this.competitionSubmissionModel.countDocuments().exec(),
      this.challengeSubmissionModel.countDocuments().exec(),
    ]);
    return {
      gamification,
      challenges: {
        published: challengesPublished,
        total: challengesTotal,
      },
      competitions: {
        total: competitionsTotal,
        active: competitionsActive,
      },
      submissions: {
        competitions: competitionSubmissionsTotal,
        challenges: challengeSubmissionsTotal,
      },
    };
  }

  private shannonBadgeEntropyNats(
    topBadges: Array<{ count?: number }>,
  ): { entropy: number; nCategories: number } {
    const counts = topBadges.map((b) => Number(b.count) || 0).filter((c) => c > 0);
    const s = counts.reduce((a, b) => a + b, 0);
    if (s <= 0 || counts.length === 0) return { entropy: 0, nCategories: 0 };
    let h = 0;
    for (const c of counts) {
      const p = c / s;
      h -= p * Math.log(p);
    }
    return { entropy: h, nCategories: counts.length };
  }

  /** ML-style insights aligned with scripts/platform-charts analytics (live, no Python required). */
  async getMlInsights() {
    const dash = await this.getDashboardOverview();
    const g = dash.gamification;
    const ch = dash.challenges;
    const comp = dash.competitions;
    const sub = dash.submissions;
    const tu = g.totalUsers || 0;
    const wb = g.usersWithBadges || 0;
    const engagementRate = tu > 0 ? wb / tu : 0;
    const engagement = Math.min(100, Math.round(engagementRate * 1800) / 10);
    const chTot = Math.max(ch.total, 1);
    const contentHealth = Math.min(100, Math.round((ch.published / chTot) * 1000) / 10);
    const subs = (sub.challenges || 0) + (sub.competitions || 0);
    const activity = Math.min(100, Math.round(250 * Math.log1p(subs)) / 10);
    const { entropy, nCategories } = this.shannonBadgeEntropyNats(g.topBadges || []);
    const maxUniform = nCategories > 1 ? Math.log(nCategories) : 0.01;
    const badgeDiversity = Math.min(100, Math.round((entropy / maxUniform) * 1000) / 10);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsers7d = await this.userModel.countDocuments({
      createdAt: { $gte: weekAgo },
    }).exec();
    let growthTrajectory = 48 + Math.min(40, newUsers7d * 7);
    if (tu < 8) growthTrajectory = Math.min(100, growthTrajectory + 8);
    if (tu >= 15 && newUsers7d === 0) growthTrajectory = Math.max(28, growthTrajectory - 18);
    growthTrajectory = Math.min(100, Math.round(growthTrajectory * 10) / 10);

    const overall =
      Math.round(
        (engagement * 0.22 +
          contentHealth * 0.18 +
          activity * 0.22 +
          badgeDiversity * 0.18 +
          growthTrajectory * 0.2) *
          10,
      ) / 10;

    let tier: string;
    if (overall >= 75) tier = 'strong';
    else if (overall >= 55) tier = 'healthy';
    else if (overall >= 40) tier = 'watch';
    else tier = 'early / ramp-up';

    const recommendations: string[] = [];
    if (engagement < 35 && tu >= 5) {
      recommendations.push('Badge adoption is low — highlight first-solve rewards and badge showcase on home.');
    }
    if (contentHealth < 50 && ch.total > 0) {
      recommendations.push('Publish or un-draft more challenges to improve content depth vs backlog.');
    }
    if (activity < 35 && tu >= 3) {
      recommendations.push('Submission volume is modest — run a timed contest or featured challenge week.');
    }
    if (badgeDiversity < 40 && (g.topBadges?.length || 0) >= 3) {
      recommendations.push('Badge distribution is concentrated — add varied achievement paths (streak, difficulty mix).');
    }
    if (comp.active === 0 && comp.total > 0) {
      recommendations.push('No active competitions — schedule one to drive engagement spikes.');
    }
    if (newUsers7d === 0 && tu >= 10) {
      recommendations.push('No new sign-ups in 7d — review acquisition channels and onboarding funnel.');
    }
    if (recommendations.length === 0) {
      recommendations.push('Metrics look balanced — export Python reports on a schedule for forecast & anomaly tracking.');
    }

    return {
      schemaVersion: '2.0',
      generatedAt: new Date().toISOString(),
      health: {
        engagement,
        contentHealth,
        activity,
        badgeDiversity,
        growthTrajectory,
        overallHealth0_100: overall,
        tier,
      },
      signals: {
        badgeEntropyNats: Math.round(entropy * 1000) / 1000,
        engagementRate: Math.round(engagementRate * 1000) / 1000,
        newUsersLast7Days: newUsers7d,
      },
      recommendations,
      dashboard: dash,
    };
  }
}

