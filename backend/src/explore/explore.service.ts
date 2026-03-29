/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Challenge, ChallengeDocument } from '../challenges/schemas/challenge.schema';
import { Competition, CompetitionDocument } from '../competitions/schemas/competition.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class ExploreService {
  constructor(
    @InjectModel(Challenge.name) private readonly challengeModel: Model<ChallengeDocument>,
    @InjectModel(Competition.name) private readonly competitionModel: Model<CompetitionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async search(q: string, limitPerType = 8) {
    const term = (q || '').trim().slice(0, 120);
    const cap = Math.min(20, Math.max(1, limitPerType));
    if (!term) {
      return {
        query: term,
        challenges: [],
        competitions: [],
        users: [],
      };
    }
    const rx = new RegExp(escapeRegex(term), 'i');
    const [challenges, competitions, users] = await Promise.all([
      this.challengeModel
        .find({
          isPublished: true,
          $or: [{ title: rx }, { description: rx }, { tags: rx }],
        })
        .select('-testCases')
        .sort({ createdAt: -1 })
        .limit(cap)
        .lean()
        .exec(),
      this.competitionModel
        .find({ $or: [{ name: rx }, { description: rx }] })
        .sort({ startTime: -1 })
        .limit(cap)
        .lean()
        .exec(),
      this.userModel
        .find({
          isActive: true,
          $or: [{ username: rx }, { displayName: rx }],
        })
        .select('username displayName avatarUrl')
        .limit(cap)
        .lean()
        .exec(),
    ]);
    return {
      query: term,
      challenges: challenges.map((c: any) => ({
        id: String(c._id),
        title: c.title,
        difficulty: c.difficulty,
        tags: c.tags || [],
        xpReward: c.xpReward,
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
