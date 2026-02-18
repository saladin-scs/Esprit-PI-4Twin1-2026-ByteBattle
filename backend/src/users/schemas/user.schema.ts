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

  @Prop({ type: [String], default: [] })
  links?: string[];

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

