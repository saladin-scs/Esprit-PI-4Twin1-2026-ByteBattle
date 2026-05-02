import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from '../challenges/schemas/challenge.schema';
import { Competition, CompetitionDocument } from '../competitions/schemas/competition.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class ExploreService {
  constructor(
    @InjectModel(Challenge.name) private readonly challengeModel: Model<ChallengeDocument>,
    @InjectModel(Competition.name) private readonly competitionModel: Model<CompetitionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async search(query: string, limit = 8) {
    const q = String(query || '').trim();
    const lim = Math.max(1, Math.min(50, Number(limit) || 8));

    if (!q || q.length < 2) {
      return {
        query: q,
        limit: lim,
        challenges: [],
        competitions: [],
        users: [],
      };
    }

    const regex = new RegExp(this.escapeRegex(q), 'i');

    const [challenges, competitions, users] = await Promise.all([
      this.challengeModel
        .find({
          isPublished: true,
          $or: [{ title: regex }, { tags: regex }, { difficulty: regex }],
        })
        .select('_id title difficulty tags xpReward')
        .sort({ updatedAt: -1 })
        .limit(lim)
        .lean()
        .exec(),
      this.competitionModel
        .find({
          $or: [{ name: regex }, { description: regex }, { type: regex }, { status: regex }],
        })
        .select('_id name status type startTime endTime')
        .sort({ startTime: -1 })
        .limit(lim)
        .lean()
        .exec(),
      this.userModel
        .find({
          isActive: true,
          $or: [{ username: regex }, { displayName: regex }, { firstName: regex }, { lastName: regex }],
        })
        .select('_id username displayName avatarUrl')
        .sort({ updatedAt: -1 })
        .limit(lim)
        .lean()
        .exec(),
    ]);

    return {
      query: q,
      challenges: challenges.map((c: any) => ({
        id: String(c._id),
        title: c.title,
        difficulty: c.difficulty,
        tags: Array.isArray(c.tags) ? c.tags : [],
        xpReward: c.xpReward ?? 0,
      })),
      competitions: competitions.map((c: any) => ({
        id: String(c._id),
        name: c.name,
        status: c.status,
        type: c.type,
        startTime: c.startTime,
        endTime: c.endTime,
      })),
      users: users.map((u: any) => ({
        id: String(u._id),
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      })),
    };
  }
}
