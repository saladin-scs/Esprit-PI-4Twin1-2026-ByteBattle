/* eslint-disable prettier/prettier */
import { Injectable, ConflictException, ForbiddenException, UnauthorizedException , NotFoundException  } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
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
  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { avatarUrl },
      { new: true }, // return the updated document
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

async updateCover(userId: string, coverUrl: string): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { coverImage: coverUrl },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
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

  /** Seuils XP pour chaque rang (F -> S) */
  static readonly RANK_XP = { F: 0, E: 100, D: 300, C: 600, B: 1000, A: 2000, S: 4000 };
  static readonly RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;

  getRankProgress(xp: number) {
    const order = UsersService.RANK_ORDER;
    const thresholds = UsersService.RANK_XP;
    let currentTier = 'F';
    let nextTier: string | null = 'E';
    let xpInTier = xp;
    let xpNeededForNext = 100;
    for (let i = 0; i < order.length - 1; i++) {
      const tier = order[i];
      const next = order[i + 1];
      const tierXp = (thresholds as any)[tier] ?? 0;
      const nextXp = (thresholds as any)[next] ?? 0;
      if (xp >= nextXp) continue;
      currentTier = tier;
      nextTier = next;
      xpInTier = xp - tierXp;
      xpNeededForNext = nextXp - tierXp;
      break;
    }
    if (xp >= (thresholds as any).S) {
      currentTier = 'S';
      nextTier = null;
      xpInTier = xp - (thresholds as any).S;
      xpNeededForNext = 0;
    }
    return {
      currentTier,
      nextTier,
      xpInTier,
      xpNeededForNext,
      progressPercent: xpNeededForNext ? Math.min(100, (xpInTier / xpNeededForNext) * 100) : 100,
    };
  }

  async findPublicByUsername(username: string) {
    const u = await this.userModel
      .findOne({ username: String(username || '').trim() })
      .select(
        'username displayName bio country avatarUrl coverImage links socialLinks profilePublic ' +
        'rating totalChallengesSolved totalBattlesWon achievements roles createdAt ' +
        'xp rankTier currentStreak longestStreak totalActiveDays lastActiveAt activityHeatmap ' +
        'dailyGoalTarget dailyGoalCompleted problemsByDifficulty acceptanceRate languageStats ' +
        'totalSubmissions totalAccepted battleLosses eloRating guildId codynCoins badgeIds emailVerifiedAt ' +
        'skillTreeProgress recentActivity',
      )
      .lean()
      .exec();
    if (!u) return null;
    const xp = (u as any).xp ?? 0;
    const rankProgress = this.getRankProgress(xp);
    const [globalRank, countryRank] = await Promise.all([
      this.getGlobalRankByXp(xp),
      (u as any).country ? this.getCountryRankByXp((u as any).country, xp) : Promise.resolve(null),
    ]);
    return {
      ...u,
      rankProgress,
      memberSince: (u as any).createdAt,
      globalRank,
      countryRank,
    };
  }

  async getGlobalRankByXp(xp: number): Promise<number> {
    const count = await this.userModel.countDocuments({ xp: { $gt: xp } }).exec();
    return count + 1;
  }

  async getCountryRankByXp(country: string, xp: number): Promise<number | null> {
    if (!country) return null;
    const count = await this.userModel.countDocuments({ country, xp: { $gt: xp } }).exec();
    return count + 1;
  }

  async findByEmail(email: string, opts?: { includeSensitive?: boolean }) {
    const q = this.userModel.findOne({ email: String(email || '').toLowerCase().trim() });
    if (opts?.includeSensitive) {
      q.select(
        '+password +emailVerificationTokenHash +passwordResetTokenHash +refreshTokens +twoFactorSecret +twoFactorBackupCodes',
      );
    }
    return q.exec();
  }

  async findByIdWithSensitive(userId: string) {
    return this.userModel
      .findById(userId)
      .select(
        '+password +emailVerificationTokenHash +passwordResetTokenHash +refreshTokens +twoFactorSecret +twoFactorBackupCodes',
      )
      .exec();
  }

  /** Mise à jour atomique 2FA (évite VersionError sur save()) */
  async setTwoFactorSetup(
    userId: string,
    data: { twoFactorSecret: string; twoFactorBackupCodes: Array<{ codeHash: string }> },
  ) {
    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          twoFactorSecret: data.twoFactorSecret,
          twoFactorBackupCodes: data.twoFactorBackupCodes,
          twoFactorEnabled: false,
        },
        { new: true },
      )
      .exec();
    return updated;
  }

  /** Active la 2FA après vérification du code (mise à jour atomique) */
  async setTwoFactorEnabled(userId: string, enabled: boolean) {
    return this.userModel
      .findByIdAndUpdate(userId, { twoFactorEnabled: enabled }, { new: true })
      .exec();
  }

  /** Désactive la 2FA et efface secret + backup codes (mise à jour atomique) */
  async clearTwoFactor(userId: string) {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
        { new: true },
      )
      .exec();
  }

  /** Met à jour les backup codes utilisés (mise à jour atomique, ex. marquer un code comme usedAt) */
  async updateTwoFactorBackupCodes(userId: string, backupCodes: Array<{ codeHash: string; usedAt?: Date }>) {
    return this.userModel
      .findByIdAndUpdate(userId, { twoFactorBackupCodes: backupCodes }, { new: true })
      .select('+twoFactorSecret +twoFactorBackupCodes')
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

  async findByProviderId(field: 'googleId' | 'githubId', providerId: string) {
    return this.userModel
      .findOne({ [field]: providerId })
      .select('-password -emailVerificationTokenHash -passwordResetTokenHash -refreshTokens')
      .exec();
  }

  async createFromSocial(data: {
    email: string;
    usernameBase: string;
    displayName?: string;
    avatarUrl?: string;
    provider: 'google' | 'github';
    providerId: string;
    emailVerified?: boolean;
  }): Promise<UserDocument> {
    const base = String(data.usernameBase || 'user')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '') || 'user';
    let username = base;
    let counter = 0;

    // ensure unique username
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await this.userModel.findOne({ username }).select('_id').exec();
      if (!exists) break;
      counter += 1;
      username = `${base}${counter}`;
    }

    const randomPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const providerField = data.provider === 'google' ? 'googleId' : 'githubId';

    const user = new this.userModel({
      email: String(data.email || '').toLowerCase().trim(),
      username,
      displayName: data.displayName,
      avatarUrl: data.avatarUrl,
      password: hashedPassword,
      authProvider: data.provider,
      [providerField]: data.providerId,
      emailVerifiedAt: data.emailVerified ? new Date() : null,
    } as any);

    return user.save();
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
      memberSince: (user as any).createdAt,
      totalBattles,
    };
  }

  async getActivity(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('activityHeatmap recentActivity lastActiveAt')
      .lean()
      .exec();
    if (!user) return null;
    const heatmap = (user as any).activityHeatmap || [];
    const recentActivity = (user as any).recentActivity || [];
    return {
      heatmap: heatmap.slice(-365),
      recentActivity: recentActivity.slice(0, 50),
      lastActiveAt: (user as any).lastActiveAt,
    };
  }

  async getActivityByUsername(username: string) {
    const user = await this.userModel
      .findOne({ username: String(username || '').trim() })
      .select('activityHeatmap recentActivity lastActiveAt')
      .lean()
      .exec();
    if (!user) return null;
    const heatmap = (user as any).activityHeatmap || [];
    const recentActivity = (user as any).recentActivity || [];
    return {
      heatmap: heatmap.slice(-365),
      recentActivity: recentActivity.slice(0, 50),
      lastActiveAt: (user as any).lastActiveAt,
    };
  }

  async getSkillTree(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('skillTreeProgress')
      .lean()
      .exec();
    if (!user) return null;
    const progress = (user as any).skillTreeProgress || {};
    const categories = ['algorithms', 'dataStructures', 'systemDesign', 'frontendBackend'];
    return categories.map((cat) => ({
      id: cat,
      name: cat === 'algorithms' ? 'Algorithms' : cat === 'dataStructures' ? 'Data Structures' : cat === 'systemDesign' ? 'System Design' : 'Frontend/Backend',
      progress: Math.min(100, progress[cat] ?? 0),
    }));
  }

  async getSkillTreeByUsername(username: string) {
    const user = await this.userModel
      .findOne({ username: String(username || '').trim() })
      .select('skillTreeProgress')
      .lean()
      .exec();
    if (!user) return null;
    const progress = (user as any).skillTreeProgress || {};
    const categories = ['algorithms', 'dataStructures', 'systemDesign', 'frontendBackend'];
    return categories.map((cat) => ({
      id: cat,
      name: cat === 'algorithms' ? 'Algorithms' : cat === 'dataStructures' ? 'Data Structures' : cat === 'systemDesign' ? 'System Design' : 'Frontend/Backend',
      progress: Math.min(100, progress[cat] ?? 0),
    }));
  }

  async consumeAndReturnNewBadge(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('lastUnlockedBadge')
      .exec();
    if (!user || !(user as any).lastUnlockedBadge) return null;
    const badge = (user as any).lastUnlockedBadge;
    await this.userModel.findByIdAndUpdate(userId, { lastUnlockedBadge: null }).exec();
    return badge;
  }

  /** À appeler quand un badge est débloqué (ex: après un défi) pour notifier le client */
  async setLastUnlockedBadge(userId: string, badgeId: string, name: string) {
    await this.userModel
      .findByIdAndUpdate(userId, {
        lastUnlockedBadge: { badgeId, name },
        $addToSet: { badgeIds: badgeId },
      })
      .exec();
  }
}
