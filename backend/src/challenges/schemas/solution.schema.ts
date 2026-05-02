import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SolutionDocument = Solution & Document;

@Schema({ timestamps: true })
export class Solution {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true })
  challengeId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  explanation: string; // Markdown supported

  @Prop({ required: false })
  timeComplexity?: string;

  @Prop({ required: false })
  spaceComplexity?: string;

  @Prop({ default: 0 })
  upvotes: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  upvotedBy: Types.ObjectId[];
}

export const SolutionSchema = SchemaFactory.createForClass(Solution);

// Index for efficient querying of top solutions per challenge
SolutionSchema.index({ challengeId: 1, upvotes: -1 });
SolutionSchema.index({ userId: 1 });
