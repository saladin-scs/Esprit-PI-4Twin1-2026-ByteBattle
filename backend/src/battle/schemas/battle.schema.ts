/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BattleDocument = Battle & Document;

export type BattleStatus = 'waiting' | 'active' | 'finished';
/** Reserved for future team-vs-team battles. */
export type BattleMode = '1v1' | 'team';

@Schema({ _id: false })
export class BattleScoreBreakdown {
  @Prop({ default: 0 })
  passScore: number;

  @Prop({ default: 0 })
  submissionSpeedScore: number;

  @Prop({ default: 0 })
  executionEfficiencyScore: number;

  @Prop({ default: 0 })
  bonusScore: number;

  @Prop({ default: 0 })
  totalScore: number;
}

const BattleScoreBreakdownSchema = SchemaFactory.createForClass(BattleScoreBreakdown);

@Schema({ _id: false })
export class BattlePlayer {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  username: string;

  @Prop({ default: false })
  isReady: boolean;

  @Prop({ default: false })
  submitted: boolean;

  @Prop({ type: Date, default: null })
  submissionTime: Date | null;

  @Prop({ type: Boolean })
  passed?: boolean;

  @Prop({ default: 0 })
  submitAttempts: number;

  @Prop({ type: BattleScoreBreakdownSchema, default: () => ({}) })
  scoreBreakdown: BattleScoreBreakdown;
}

const BattlePlayerSchema = SchemaFactory.createForClass(BattlePlayer);

@Schema({ _id: false })
export class BattleSubmission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, trim: true })
  language: string;

  @Prop({ type: Object, default: {} })
  result: Record<string, unknown>;

  @Prop({ default: 0 })
  executionTime: number;

  @Prop({ default: false })
  passed: boolean;

  @Prop({ type: Date, default: () => new Date() })
  submittedAt: Date;
}

const BattleSubmissionSchema = SchemaFactory.createForClass(BattleSubmission);

@Schema({ timestamps: true })
export class Battle {
  @Prop({ enum: ['1v1', 'team'], default: '1v1', index: true })
  mode: BattleMode;

  @Prop({ type: [BattlePlayerSchema], default: [] })
  players: BattlePlayer[];

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true, index: true })
  challengeId: Types.ObjectId;

  @Prop({ enum: ['waiting', 'active', 'finished'], default: 'waiting', index: true })
  status: BattleStatus;

  @Prop({ type: Date, default: null })
  startedAt: Date | null;

  @Prop({ type: Date, default: null, index: true })
  endsAt: Date | null;

  @Prop({ required: true, min: 30, max: 7200 })
  durationSeconds: number;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  winnerId: Types.ObjectId | null;

  @Prop({ default: false })
  draw: boolean;

  @Prop({ type: [BattleSubmissionSchema], default: [] })
  submissions: BattleSubmission[];

  @Prop({ trim: true })
  finishReason?: string;

  @Prop({
    type: Object,
    default: () => ({
      passedAllTests: 50,
      submissionSpeed: 25,
      executionEfficiency: 15,
      bonus: 10,
    }),
  })
  scoreWeights: {
    passedAllTests: number;
    submissionSpeed: number;
    executionEfficiency: number;
    bonus: number;
  };
}

export const BattleSchema = SchemaFactory.createForClass(Battle);
BattleSchema.index({ status: 1, updatedAt: -1 });
BattleSchema.index({ 'players.userId': 1, status: 1 });
