import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class ChallengeRecommendation extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  challengeId: string;

  @Prop({ type: Number })
  score: number;

  @Prop({ type: String })
  reason: string;

  @Prop({ type: Number })
  estimatedSuccessRate: number;

  @Prop({ type: String, enum: ['Easy', 'Medium', 'Hard', 'Expert'] })
  difficulty: string;

  @Prop({ type: Boolean, default: false })
  completed: boolean;

  @Prop({ type: Boolean, default: false })
  clicked: boolean;

  @Prop({ type: Date })
  clickedAt?: Date;

  @Prop({ type: Date, default: Date.now })
  recommendedAt: Date;
}

export const ChallengeRecommendationSchema = SchemaFactory.createForClass(ChallengeRecommendation);
