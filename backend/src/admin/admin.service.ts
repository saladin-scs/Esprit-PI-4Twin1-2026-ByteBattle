import { Injectable, NotFoundException } from '@nestjs/common';
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

  async updateUser(userId: string, update: { roles?: string[]; isActive?: boolean }) {
    const set: any = {};
    if (Array.isArray(update.roles)) set.roles = update.roles;
    if (typeof update.isActive === 'boolean') set.isActive = update.isActive;

    const user = await this.userModel
      .findByIdAndUpdate(userId, { $set: set }, { new: true })
      .select('email username displayName roles isAdmin isActive emailVerifiedAt createdAt')
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}

