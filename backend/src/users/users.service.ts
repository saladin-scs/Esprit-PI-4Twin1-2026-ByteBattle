import { Injectable, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import { SecurityEventsService } from '../security-events/security-events.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private securityEvents: SecurityEventsService,
  ) {}

  async create(dto: any): Promise<UserDocument> {
    try {
      const email = String(dto.email || '').toLowerCase().trim();
      const username = String(dto.username || '').trim();
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const user = new this.userModel({
        ...dto,
        email,
        username,
        password: hashedPassword,
        roles: dto.roles?.length ? dto.roles : undefined,
      });
      return await user.save();
    } catch (err: any) {
      // Catch duplicate key error (email/username)
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw err; // rethrow other errors
    }
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel
      .findOne({ email: String(email || '').toLowerCase().trim() })
      .select('+password')
      .exec();
    if (!user) return null;
    if (user.isActive === false) return null;

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;

    return user;
  }

  // Find one user by ID
  async findOne(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findById(userId)
      .select(
        '-password -emailVerificationTokenHash -passwordResetTokenHash -refreshTokens',
      )
      .exec();
  }

  // Update user by ID
  async update(userId: string, updateData: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, updateData, { new: true }).exec();
  }

  async updateMe(userId: string, updateData: Partial<User>): Promise<UserDocument | null> {
    const forbiddenKeys = new Set([
      'password',
      'email',
      'roles',
      'isAdmin',
      'isActive',
      'rating',
      'totalChallengesSolved',
      'totalBattlesWon',
      'achievements',
      'emailVerifiedAt',
      'emailVerificationTokenHash',
      'passwordResetTokenHash',
      'passwordResetExpiresAt',
      'refreshTokens',
    ]);

    for (const k of Object.keys(updateData || {})) {
      if (forbiddenKeys.has(k)) {
        throw new ForbiddenException(`Field "${k}" cannot be updated here`);
      }
    }

    return this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-password -emailVerificationTokenHash -passwordResetTokenHash -refreshTokens')
      .exec();
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId).select('+password').exec();
    if (!user) throw new UnauthorizedException();
    if (user.isActive === false) throw new UnauthorizedException();

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Invalid password');

    user.password = await bcrypt.hash(newPassword, 10);
    // revoke all refresh tokens on password change
    user.refreshTokens = [];
    await user.save();

    await this.securityEvents.record({
      type: 'user.change_password',
      userId: String(user._id),
    });

    return { success: true };
  }

  async findPublicByUsername(username: string) {
    const u = await this.userModel
      .findOne({ username: String(username || '').trim() })
      .select(
        'username displayName bio country avatarUrl links rating totalChallengesSolved totalBattlesWon achievements roles createdAt',
      )
      .exec();
    return u;
  }

  async findByEmail(email: string, opts?: { includeSensitive?: boolean }) {
    const q = this.userModel.findOne({ email: String(email || '').toLowerCase().trim() });
    if (opts?.includeSensitive) {
      q.select(
        '+password +emailVerificationTokenHash +passwordResetTokenHash +refreshTokens',
      );
    }
    return q.exec();
  }

  async findByIdWithSensitive(userId: string) {
    return this.userModel
      .findById(userId)
      .select(
        '+password +emailVerificationTokenHash +passwordResetTokenHash +refreshTokens',
      )
      .exec();
  }

  async findByEmailVerificationTokenHash(tokenHash: string) {
    return this.userModel
      .findOne({ emailVerificationTokenHash: tokenHash })
      .select('+emailVerificationTokenHash')
      .exec();
  }

  async findByPasswordResetTokenHash(tokenHash: string) {
    return this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { $gt: new Date() },
      })
      .select('+passwordResetTokenHash +password +refreshTokens')
      .exec();
  }

  async getMeStats(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('rating totalChallengesSolved totalBattlesWon achievements createdAt')
      .exec();
    if (!user) return null;

    const totalBattles = user.totalBattlesWon ?? 0;
    return {
      rating: user.rating ?? 0,
      totalChallengesSolved: user.totalChallengesSolved ?? 0,
      totalBattlesWon: user.totalBattlesWon ?? 0,
      achievementsCount: user.achievements?.length ?? 0,
      memberSince: user.createdAt,
      // Placeholder for future battle stats once competitions results are persisted
      totalBattles,
    };
  }
}
