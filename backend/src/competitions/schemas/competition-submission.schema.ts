/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompetitionSubmissionDocument = CompetitionSubmission & Document;

@Schema({ timestamps: true })
export class CompetitionSubmission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Competition', required: true, index: true })
  competitionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true, index: true })
  challengeId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ enum: ['javascript', 'python', 'java', 'cpp'], required: true })
  language: string;

  @Prop({ enum: ['accepted', 'wrong_answer', 'runtime_error', 'time_limit', 'pending'], default: 'pending' })
  status: string;

  /** Primary score: bytes (code_golf), ms (speed), or points (algorithmic). Lower is better for golf/speed. */
  @Prop({ required: true, default: 0 })
  score: number;

  /** Execution time in ms (for speed challenge and tie-breaker) */
  @Prop({ default: 0 })
  executionTimeMs: number;

  @Prop({ default: 0 })
  passedTests: number;

  @Prop({ default: 0 })
  totalTests: number;

  @Prop({ default: false })
  isBest: boolean;
}

export const CompetitionSubmissionSchema = SchemaFactory.createForClass(CompetitionSubmission);

CompetitionSubmissionSchema.index({ competitionId: 1, userId: 1, challengeId: 1 });
CompetitionSubmissionSchema.index({ competitionId: 1, score: 1, createdAt: 1 });
