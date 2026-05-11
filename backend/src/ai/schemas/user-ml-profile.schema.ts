import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserMLProfile extends Document {
  @Prop({ required: true, unique: true })
  userId: string;

  @Prop({ type: Number, default: 1500 })
  skillRating: number;

  @Prop({ type: Number, default: 0 })
  predictedSuccessRate: number;

  @Prop({ type: Number })
  skillCluster: number;

  @Prop({ type: [String], default: [] })
  recommendedFocusAreas: string[];

  @Prop({ type: Number, default: 0 })
  challengesCompleted: number;

  @Prop({ type: Number, default: 0 })
  challengesAttempted: number;

  @Prop({ type: Number, default: 0 })
  totalSuccesses: number;

  @Prop({ type: [Number], default: [] })
  embeddings: number[];

  @Prop({ type: Date, default: Date.now })
  lastUpdated: Date;
}

export const UserMLProfileSchema = SchemaFactory.createForClass(UserMLProfile);
