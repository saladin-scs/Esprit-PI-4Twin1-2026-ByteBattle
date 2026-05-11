/* eslint-disable prettier/prettier */
import { Injectable, ConflictException, ForbiddenException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Submission, SubmissionDocument } from '../challenges/schemas/Submission.schema';
import { Solution, SolutionDocument } from '../challenges/schemas/solution.schema';
import { CompetitionSubmission, CompetitionSubmissionDocument } from '../competitions/schemas/competition-submission.schema';
import { Reclamation, ReclamationDocument } from '../reclamations/schemas/reclamation.schema';
import { SiteRating, SiteRatingDocument } from '../site-ratings/schemas/site-rating.schema';
import { Notification, NotificationDocument } from '../notifications/schemas/notification.schema';
import { ApiKey, ApiKeyDocument } from '../api-keys/schemas/api-key.schema';
import { UpdateMeDto } from './dto/update-me.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { SecurityEventsService } from '../security-events/security-events.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Submission.name)
    private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Solution.name)
    private solutionModel: Model<SolutionDocument>,
    @InjectModel(CompetitionSubmission.name)
    private competitionSubmissionModel: Model<CompetitionSubmissionDocument>,
    @InjectModel(Reclamation.name)
    private reclamationModel: Model<ReclamationDocument>,
    @InjectModel(SiteRating.name)
    private siteRatingModel: Model<SiteRatingDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(ApiKey.name)
    private apiKeyModel: Model<ApiKeyDocument>,
    private securityEvents: SecurityEventsService,
  ) {}

  async create(dto: any): Promise<UserDocument> {
    try {
      const email = String(dto.email || '').toLowerCase().trim();
      const username = String(dto.username || '').trim();
      const hashedPassword = await bcrypt.hash(dto.password, 10);
      const faceDescriptor = dto.faceDescriptor;
      const faceEmbedding = Array.isArray(faceDescriptor) && faceDescriptor.length === 128
        ? faceDescriptor
        : undefined;

      const firstName = dto.firstName != null ? String(dto.firstName).trim() : '';
      const lastName = dto.lastName != null ? String(dto.lastName).trim() : '';
      const phone = dto.phone != null ? String(dto.phone).trim() : '';
      let dateOfBirth: Date | null = null;
      if (dto.dateOfBirth) {
        const d = new Date(dto.dateOfBirth);
        if (!Number.isNaN(d.getTime())) dateOfBirth = d;
      }
      const displayNameFromRegister = [firstName, lastName].filter(Boolean).join(' ').trim() || undefined;

      const preferences: Record<string, unknown> = {
        preferredLanguage: 'python',
        theme: 'dark',
        notifications: { email: true, product: true },
      };
      if (typeof dto.newsletter === 'boolean') preferences.newsletter = dto.newsletter;
      const ref = dto.referralSource != null ? String(dto.referralSource).trim() : '';
      if (ref) preferences.referralSource = ref;

      const user = new this.userModel({
        email,
        username,
        password: hashedPassword,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phone: phone || undefined,
        dateOfBirth,
        displayName: displayNameFromRegister,
        preferences,
        roles: dto.roles?.length ? dto.roles : undefined,
        ...(faceEmbedding && { faceEmbedding }),
      });
      return await user.save();
    } catch (err: any) {
      if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        throw new ConflictException(`User with this ${field} already exists`);
      }
      throw err;
    }
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email: String(email || '').toLowerCase().trim() }).select('+password').exec();
    if (!user || user.isActive === false) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return user;
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { avatarUrl },
      { new: true },
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

  async findOne(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId)
      .select('-password -emailVerificationTokenHash -passwordResetTokenHash -refreshTokens').exec();
  }

  async findByIds(userIds: string[]): Promise<Array<{ _id: Types.ObjectId; username: string }>> {
    if (!userIds?.length) return [];
    const list = await this.userModel
      .find({ _id: { $in: userIds.map((id) => new Types.ObjectId(id)) } })
      .select('username')
      .lean()
      .exec();
    return list as Array<{ _id: Types.ObjectId; username: string }>;
  }

  async update(userId: string, updateData: Partial<User>): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, updateData, { new: true }).exec();
  }

  async updateMe(userId: string, updateData: UpdateMeDto): Promise<UserDocument | null> {
    const forbiddenKeys = new Set(['password', 'email', 'roles', 'isAdmin', 'isActive', 'rating', 'totalChallengesSolved', 'totalBattlesWon', 'achievements', 'emailVerifiedAt', 'emailVerificationTokenHash', 'passwordResetTokenHash', 'passwordResetExpiresAt', 'refreshTokens']);
    for (const k of Object.keys(updateData || {})) {
      if (forbiddenKeys.has(k)) throw new ForbiddenException(`Field "${k}" cannot be updated here`);
    }
    const { dateOfBirth, ...rest } = updateData;
    const payload: Record<string, unknown> = { ...rest };
    if (dateOfBirth) payload.dateOfBirth = new Date(dateOfBirth);
    return this.userModel.findByIdAndUpdate(userId, payload, { new: true })
      .select('-password -emailVerificationTokenHash -passwordResetTokenHash -refreshTokens').exec();
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId).select('+password').exec();
    if (!user) throw new UnauthorizedException();
    if (user.isActive === false) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Invalid password');
    user.password = await bcrypt.hash(newPassword, 10);
    user.refreshTokens = [];
    await user.save();
    await this.securityEvents.record({ type: 'user.change_password', userId: String(user._id) });
    return { success: true };
  }

  static readonly RANK_XP = { F: 0, E: 100, D: 300, C: 600, B: 1000, A: 2000, S: 4000 };
  static readonly RANK_ORDER = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;

  getRankProgress(xp: number) {
    const order = UsersService.RANK_ORDER;
    const thresholds = UsersService.RANK_XP;
    let currentTier = 'F'; let nextTier: string | null = 'E'; let xpInTier = xp; let xpNeededForNext = 100;
    for (let i = 0; i < order.length - 1; i++) {
      const tier = order[i]; const next = order[i + 1];
      const tierXp = (thresholds as any)[tier] ?? 0; const nextXp = (thresholds as any)[next] ?? 0;
      if (xp >= nextXp) continue;
      currentTier = tier; nextTier = next; xpInTier = xp - tierXp; xpNeededForNext = nextXp - tierXp; break;
    }
    if (xp >= (thresholds as any).S) { currentTier = 'S'; nextTier = null; xpInTier = xp - (thresholds as any).S; xpNeededForNext = 0; }
    return { currentTier, nextTier, xpInTier, xpNeededForNext, progressPercent: xpNeededForNext ? Math.min(100, (xpInTier / xpNeededForNext) * 100) : 100 };
  }

  getRankTierFromXp(xp: number): string {
    const thresholds = UsersService.RANK_XP;
    const order = UsersService.RANK_ORDER;
    let tier = 'F';
    for (let i = order.length - 1; i >= 0; i--) {
      const t = order[i];
      if (xp >= ((thresholds as any)[t] ?? 0)) {
        tier = t;
        break;
      }
    }
    return tier;
  }

  async addXpForChallenge(userId: string, xpEarned: number): Promise<void> {
    if (!userId || xpEarned <= 0) return;
    const user = await this.userModel.findById(userId).select('xp').lean().exec();
    if (!user) return;
    const currentXp = (user as any).xp ?? 0;
    const newXp = currentXp + xpEarned;
    const rankTier = this.getRankTierFromXp(newXp);
    await this.userModel.findByIdAndUpdate(userId, {
      $inc: { xp: xpEarned, totalChallengesSolved: 1 },
      $set: { rankTier },
    }).exec();
  }

  async findPublicByUsername(username: string) {
    const u = await this.userModel.findOne({ username: String(username || '').trim() })
      .select('username displayName firstName lastName bio country avatarUrl coverImage links socialLinks profilePublic rating totalChallengesSolved totalBattlesWon achievements roles createdAt xp rankTier currentStreak longestStreak totalActiveDays lastActiveAt activityHeatmap dailyGoalTarget dailyGoalCompleted problemsByDifficulty acceptanceRate languageStats totalSubmissions totalAccepted battleLosses eloRating guildId codynCoins badgeIds emailVerifiedAt skillTreeProgress recentActivity')
      .lean().exec();
    if (!u) return null;
    const xp = (u as any).xp ?? 0;
    const rankProgress = this.getRankProgress(xp);
    const [globalRank, countryRank] = await Promise.all([this.getGlobalRankByXp(xp), (u as any).country ? this.getCountryRankByXp((u as any).country, xp) : Promise.resolve(null)]);
    return { ...u, rankProgress, memberSince: (u as any).createdAt, globalRank, countryRank };
  }

  async getGlobalRankByXp(xp: number): Promise<number> { return (await this.userModel.countDocuments({ xp: { $gt: xp } }).exec()) + 1; }
  async getCountryRankByXp(country: string, xp: number): Promise<number | null> { if (!country) return null; return (await this.userModel.countDocuments({ country, xp: { $gt: xp } }).exec()) + 1; }

  async findByEmail(email: string, opts?: { includeSensitive?: boolean }) {
    const q = this.userModel.findOne({ email: String(email || '').toLowerCase().trim() });
    if (opts?.includeSensitive) q.select('+password +emailVerificationTokenHash +passwordResetTokenHash +refreshTokens +twoFactorSecret +twoFactorBackupCodes');
    return q.exec();
  }

  async findByIdWithSensitive(userId: string) {
    return this.userModel.findById(userId).select('+password +emailVerificationTokenHash +passwordResetTokenHash +refreshTokens +twoFactorSecret +twoFactorBackupCodes').exec();
  }

  async setTwoFactorSetup(userId: string, data: { twoFactorSecret: string; twoFactorBackupCodes: Array<{ codeHash: string }> }) {
    return this.userModel.findByIdAndUpdate(userId, { twoFactorSecret: data.twoFactorSecret, twoFactorBackupCodes: data.twoFactorBackupCodes, twoFactorEnabled: false }, { new: true }).exec();
  }
  async setTwoFactorEnabled(userId: string, enabled: boolean) { return this.userModel.findByIdAndUpdate(userId, { twoFactorEnabled: enabled }, { new: true }).exec(); }
  async clearTwoFactor(userId: string) { return this.userModel.findByIdAndUpdate(userId, { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] }, { new: true }).exec(); }
  async updateTwoFactorBackupCodes(userId: string, backupCodes: Array<{ codeHash: string; usedAt?: Date }>) {
    return this.userModel.findByIdAndUpdate(userId, { twoFactorBackupCodes: backupCodes }, { new: true }).select('+twoFactorSecret +twoFactorBackupCodes').exec();
  }
  async findByEmailVerificationTokenHash(tokenHash: string) { return this.userModel.findOne({ emailVerificationTokenHash: tokenHash }).select('+emailVerificationTokenHash').exec(); }
  async findByPasswordResetTokenHash(tokenHash: string) { return this.userModel.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } }).select('+passwordResetTokenHash +password +refreshTokens').exec(); }
  async findByProviderId(field: 'googleId' | 'githubId', providerId: string) { return this.userModel.findOne({ [field]: providerId }).select('-password -emailVerificationTokenHash -passwordResetTokenHash -refreshTokens').exec(); }

  async createFromSocial(data: { email: string; usernameBase: string; displayName?: string; avatarUrl?: string; provider: 'google' | 'github'; providerId: string; emailVerified?: boolean }): Promise<UserDocument> {
    const base = String(data.usernameBase || 'user').toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user';
    let username = base; let counter = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const exists = await this.userModel.findOne({ username }).select('_id').exec();
      if (!exists) break;
      counter += 1; username = `${base}${counter}`;
    }
    const hashedPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    const providerField = data.provider === 'google' ? 'googleId' : 'githubId';
    return new this.userModel({ email: String(data.email || '').toLowerCase().trim(), username, displayName: data.displayName, avatarUrl: data.avatarUrl, password: hashedPassword, authProvider: data.provider, [providerField]: data.providerId, emailVerifiedAt: data.emailVerified ? new Date() : null } as any).save();
  }

  async getMeStats(userId: string) {
    const user = await this.userModel.findById(userId).select('rating totalChallengesSolved totalBattlesWon achievements createdAt').exec();
    if (!user) return null;
    return { rating: user.rating ?? 0, totalChallengesSolved: user.totalChallengesSolved ?? 0, totalBattlesWon: user.totalBattlesWon ?? 0, achievementsCount: user.achievements?.length ?? 0, memberSince: (user as any).createdAt, totalBattles: user.totalBattlesWon ?? 0 };
  }

  async getActivity(userId: string) {
    const user = await this.userModel.findById(userId).select('activityHeatmap recentActivity lastActiveAt').lean().exec();
    if (!user) return null;
    return { heatmap: ((user as any).activityHeatmap || []).slice(-365), recentActivity: ((user as any).recentActivity || []).slice(0, 50), lastActiveAt: (user as any).lastActiveAt };
  }

  async getActivityByUsername(username: string) {
    const user = await this.userModel.findOne({ username: String(username || '').trim() }).select('activityHeatmap recentActivity lastActiveAt').lean().exec();
    if (!user) return null;
    return { heatmap: ((user as any).activityHeatmap || []).slice(-365), recentActivity: ((user as any).recentActivity || []).slice(0, 50), lastActiveAt: (user as any).lastActiveAt };
  }

  async getSkillTree(userId: string) {
    const user = await this.userModel.findById(userId).select('skillTreeProgress').lean().exec();
    if (!user) return null;
    const p = (user as any).skillTreeProgress || {};
    return ['algorithms', 'dataStructures', 'systemDesign', 'frontendBackend'].map((cat) => ({ id: cat, name: cat === 'algorithms' ? 'Algorithms' : cat === 'dataStructures' ? 'Data Structures' : cat === 'systemDesign' ? 'System Design' : 'Frontend/Backend', progress: Math.min(100, p[cat] ?? 0) }));
  }

  async getSkillTreeByUsername(username: string) {
    const user = await this.userModel.findOne({ username: String(username || '').trim() }).select('skillTreeProgress').lean().exec();
    if (!user) return null;
    const p = (user as any).skillTreeProgress || {};
    return ['algorithms', 'dataStructures', 'systemDesign', 'frontendBackend'].map((cat) => ({ id: cat, name: cat === 'algorithms' ? 'Algorithms' : cat === 'dataStructures' ? 'Data Structures' : cat === 'systemDesign' ? 'System Design' : 'Frontend/Backend', progress: Math.min(100, p[cat] ?? 0) }));
  }

  async consumeAndReturnNewBadge(userId: string) {
    const user = await this.userModel.findById(userId).select('lastUnlockedBadge').exec();
    if (!user || !(user as any).lastUnlockedBadge) return null;
    const badge = (user as any).lastUnlockedBadge;
    await this.userModel.findByIdAndUpdate(userId, { lastUnlockedBadge: null }).exec();
    return badge;
  }

  async buildPersonalDataExport(userId: string) {
    const oid = new Types.ObjectId(userId);
    const user = await this.userModel
      .findById(userId)
      .select('+faceEmbedding')
      .lean()
      .exec();
    if (!user) throw new NotFoundException('User not found');

    const u = user as Record<string, unknown>;
    delete u.password;
    delete u.emailVerificationTokenHash;
    delete u.passwordResetTokenHash;
    delete u.refreshTokens;
    delete u.twoFactorSecret;
    delete u.twoFactorBackupCodes;

    const [
      challengeSubmissions,
      communitySolutions,
      competitionSubmissions,
      reclamations,
      siteRating,
      notifications,
      apiKeyRows,
    ] = await Promise.all([
      this.submissionModel.find({ userId: oid }).sort({ createdAt: -1 }).limit(5000).lean().exec(),
      this.solutionModel.find({ userId: oid }).sort({ createdAt: -1 }).limit(2000).lean().exec(),
      this.competitionSubmissionModel.find({ userId: oid }).sort({ createdAt: -1 }).limit(2000).lean().exec(),
      this.reclamationModel.find({ userId: oid }).sort({ createdAt: -1 }).limit(500).lean().exec(),
      this.siteRatingModel.findOne({ userId: oid }).lean().exec(),
      this.notificationModel.find({ userId: oid }).sort({ createdAt: -1 }).limit(2000).lean().exec(),
      this.apiKeyModel.find({ userId: oid }).select('-keyHash').sort({ createdAt: -1 }).lean().exec(),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      schemaVersion: 1,
      profile: u,
      challengeSubmissions,
      communitySolutions,
      competitionSubmissions,
      reclamations,
      siteRating: siteRating ?? null,
      notifications,
      apiKeys: apiKeyRows,
    };
  }

  async setLastUnlockedBadge(userId: string, badgeId: string, name: string) {
    await this.userModel.findByIdAndUpdate(userId, { lastUnlockedBadge: { badgeId, name }, $addToSet: { badgeIds: badgeId } }).exec();
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  }

  async registerFace(userId: string, embedding: number[]) {
    return this.userModel.findByIdAndUpdate(userId, { faceEmbedding: embedding }, { new: true }).exec();
  }

  async verifyFace(userId: string, embedding: number[]): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('+faceEmbedding').exec();
    if (!user || !(user as any).faceEmbedding?.length) return false;
    return this.euclideanDistance((user as any).faceEmbedding, embedding) < 0.6;
  }

  async verifyFaceByEmail(email: string, embedding: number[]): Promise<boolean> {
    const user = await this.userModel
      .findOne({ email: String(email || '').toLowerCase().trim() })
      .select('+faceEmbedding')
      .exec();

    if (!user) throw new UnauthorizedException('User not found');
    if (!(user as any).faceEmbedding?.length) {
      throw new UnauthorizedException('No face is registered for this account. Sign up with face recognition first.');
    }

    return this.euclideanDistance((user as any).faceEmbedding, embedding) < 0.6;
  }

  async verifyFaceByEmailAndGetUser(email: string, embedding: number[]): Promise<UserDocument | null> {
    const user = await this.userModel
      .findOne({ email: String(email || '').toLowerCase().trim() })
      .select('+faceEmbedding')
      .exec();

    if (!user) throw new UnauthorizedException('User not found');
    if (!(user as any).faceEmbedding?.length) {
      throw new UnauthorizedException('No face is registered for this account. Sign up with face recognition first.');
    }

    const match = this.euclideanDistance((user as any).faceEmbedding, embedding) < 0.6;
    return match ? user : null;
  }
}