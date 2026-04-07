import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChallengeSessionDocument = ChallengeSession & Document;

/** Per-user attempt state until first acceptance on a challenge (timer + revealed hints). */
@Schema({ timestamps: true })
export class ChallengeSession {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true, index: true })
  challengeId: Types.ObjectId;

  /** Server time when the user started this attempt (matchmaking = opening the challenge while unsolved). */
  @Prop({ type: Date, required: true })
  startedAt: Date;

  /** Indices into challenge.hints that were revealed (persisted). */
  @Prop({ type: [Number], default: [] })
  revealedHintIndices: number[];
}

export const ChallengeSessionSchema = SchemaFactory.createForClass(ChallengeSession);
ChallengeSessionSchema.index({ userId: 1, challengeId: 1 }, { unique: true });
