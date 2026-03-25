    /* eslint-disable prettier/prettier */
    import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
    import { Document } from 'mongoose';

    export type UserDocument = User & Document;

    export type UserRole = 'user' | 'moderator' | 'admin';

    @Schema({ timestamps: true })
    export class User {
      @Prop({ required: true, unique: true, lowercase: true, trim: true })
      email: string;

      @Prop({ required: true, unique: true, trim: true })
      username: string;

      @Prop({ required: true, select: false })
      password: string;

      // Profile
      @Prop({ trim: true })
      displayName?: string;

      @Prop({ trim: true, maxlength: 500 })
      bio?: string;

      @Prop({ trim: true })
      country?: string;

      @Prop({ trim: true })
      avatarUrl?: string;

      @Prop({ trim: true })
      coverImage?: string;

      @Prop({ type: [String], default: [] })
      links?: string[];

      @Prop({
        type: {
          github: String,
          linkedin: String,
          twitter: String,
          portfolio: String,
        },
        default: () => ({}),
      })
      socialLinks?: { github?: string; linkedin?: string; twitter?: string; portfolio?: string };

      @Prop({ default: false })
      profilePublic?: boolean;

      // Rank & Progression (7-tier: F, E, D, C, B, A, S)
      @Prop({ default: 0 })
      xp?: number;

      @Prop({ enum: ['F', 'E', 'D', 'C', 'B', 'A', 'S'], default: 'F' })
      rankTier?: string;

      // Activity & Streaks
      @Prop({ default: 0 })
      currentStreak?: number;

      @Prop({ default: 0 })
      longestStreak?: number;

      @Prop({ default: 0 })
      totalActiveDays?: number;

      @Prop({ default: null })
      lastActiveAt?: Date | null;

      @Prop({ type: [Object], default: [] })
      activityHeatmap?: Array<{ date: string; count: number }>;

      @Prop({ default: 0 })
      dailyGoalTarget?: number;

      @Prop({ default: 0 })
      dailyGoalCompleted?: number;

      // Coding stats
      @Prop({
        type: { easy: Number, medium: Number, hard: Number },
        default: () => ({ easy: 0, medium: 0, hard: 0 }),
      })
      problemsByDifficulty?: { easy: number; medium: number; hard: number };

      @Prop({ default: 0 })
      acceptanceRate?: number;

      @Prop({ type: Object, default: () => ({}) })
      languageStats?: Record<string, number>;

      @Prop({ default: 0 })
      totalSubmissions?: number;

      @Prop({ default: 0 })
      totalAccepted?: number;

      // Combat & Guild
      @Prop({ default: 0 })
      battleLosses?: number;

      @Prop({ default: 1000 })
      eloRating?: number;

      @Prop({ default: null })
      guildId?: string | null;

      // Virtual economy (Codyn Coins)
      @Prop({ default: 0 })
      codynCoins?: number;

      // Badges: array of badge IDs earned
      @Prop({ type: [String], default: [] })
      badgeIds?: string[];

      // Last unlocked badge (consumed by client, then cleared)
      @Prop({
        type: { badgeId: String, name: String },
        default: null,
      })
      lastUnlockedBadge?: { badgeId: string; name: string } | null;

      // Skill tree progress (e.g. algorithms, dataStructures, systemDesign, frontendBackend)
      @Prop({ type: Object, default: () => ({}) })
      skillTreeProgress?: Record<string, number>;

      // Recent activity feed (submissions, badge unlocks, etc.)
      @Prop({
        type: [
          {
            type: { type: String },
            date: Date,
            title: String,
            success: Boolean,
            metadata: Object,
          },
        ],
        default: [],
      })
      recentActivity?: Array<{
        type: string;
        date: Date;
        title?: string;
        success?: boolean;
        metadata?: Record<string, any>;
      }>;

      @Prop({
        type: Object,
        default: {
          preferredLanguage: 'python',
          theme: 'dark',
          notifications: { email: true, product: true },
        },
      })
      preferences?: Record<string, any>;

      // Authorization
      @Prop({
        type: [String],
        enum: ['user', 'moderator', 'admin'],
        default: ['user'],
      })
      roles: UserRole[];

      @Prop({ default: 0 })
      rating: number;

      @Prop({ default: 0 })
      totalChallengesSolved: number;

      @Prop({ default: 0 })
      totalBattlesWon: number;

      @Prop({ type: [String], default: [] })
      achievements: string[];

      @Prop({ default: true })
      isActive: boolean;

      // Legacy flag kept for backward compatibility/migration
      @Prop({ default: false })
      isAdmin: boolean;

      // Social auth
      @Prop({ default: null, index: true, sparse: true })
      googleId?: string | null;

      @Prop({ default: null, index: true, sparse: true })
      githubId?: string | null;

      @Prop({ default: null })
      authProvider?: 'local' | 'google' | 'github' | null;

      // Email verification & password reset
      @Prop({ default: null })
      emailVerifiedAt?: Date | null;

      @Prop({ default: null, select: false })
      emailVerificationTokenHash?: string | null;

      @Prop({ default: null, select: false })
      passwordResetTokenHash?: string | null;

      @Prop({ default: null })
      passwordResetExpiresAt?: Date | null;

      // Session management (hashed refresh tokens)
      @Prop({
        type: [
          {
            tokenHash: { type: String, required: true, select: false },
            createdAt: { type: Date, default: Date.now },
            expiresAt: { type: Date },
            lastUsedAt: { type: Date },
            revokedAt: { type: Date },
            ip: { type: String },
            userAgent: { type: String },
          },
        ],
        default: [],
        select: false,
      })
      refreshTokens?: Array<{
        tokenHash: string;
        createdAt: Date;
        expiresAt?: Date;
        lastUsedAt?: Date;
        revokedAt?: Date;
        ip?: string;
        userAgent?: string;
      }>;

      // Two-factor authentication (TOTP)
      @Prop({ default: false })
      twoFactorEnabled?: boolean;

      @Prop({ default: null, select: false })
      twoFactorSecret?: string | null;

      @Prop({
        type: [
          {
            codeHash: { type: String, required: true, select: false },
            usedAt: { type: Date },
          },
        ],
        default: [],
        select: false,
      })
      twoFactorBackupCodes?: Array<{
        codeHash: string;
        usedAt?: Date;
      }>;
    }

    export const UserSchema = SchemaFactory.createForClass(User);

    UserSchema.set('toJSON', {
      transform: (_doc: any, ret: any) => {
        delete ret.password;
        delete ret.emailVerificationTokenHash;
        delete ret.passwordResetTokenHash;
        delete ret.refreshTokens;
        return ret;
      },
    });

