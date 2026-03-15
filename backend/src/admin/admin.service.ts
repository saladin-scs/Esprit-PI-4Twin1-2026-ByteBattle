import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
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
}

