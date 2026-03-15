/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CompetitionDocument = Competition & Document;

/** Competition format: scoring and ranking rules */
export type CompetitionType = 'code_golf' | 'speed' | 'algorithmic';

/** Lifecycle status */
export type CompetitionStatus = 'scheduled' | 'active' | 'closed' | 'archived';

@Schema({ timestamps: true })
export class Competition {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ enum: ['code_golf', 'speed', 'algorithmic'], required: true })
  type: CompetitionType;

  @Prop({ enum: ['scheduled', 'active', 'closed', 'archived'], default: 'scheduled' })
  status: CompetitionStatus;

  /** Single challenge for code_golf and speed; multiple for algorithmic */
  @Prop({ type: [Types.ObjectId], ref: 'Challenge', required: true })
  challengeIds: Types.ObjectId[];

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ type: [String], enum: ['javascript', 'python', 'java', 'cpp'], default: ['javascript', 'python', 'java', 'cpp'] })
  supportedLanguages: string[];

  /** Human-readable rules (e.g. tie-breakers, scoring) */
  @Prop({ default: '' })
  rules: string;

  @Prop({ type: [String], default: [] })
  participants: string[];
}

export const CompetitionSchema = SchemaFactory.createForClass(Competition);

CompetitionSchema.index({ status: 1, startTime: -1 });
CompetitionSchema.index({ endTime: 1 });
