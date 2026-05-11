import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PerformancePrediction extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  challengeId: string;

  @Prop({ type: Number, min: 0, max: 1 })
  predictedSuccessProbability: number;

  @Prop({ type: Number })
  difficulty: number;

  @Prop({ type: Number })
  estimatedTimeMinutes: number;

  @Prop({ type: String, enum: ['rf', 'svm', 'dt', 'lr', 'mlp'] })
  modelUsed: string;

  @Prop({ type: Number, min: 0, max: 1 })
  modelConfidence: number;

  @Prop({ type: Boolean })
  actualSuccess?: boolean;

  @Prop({ type: Date, default: Date.now })
  predictedAt: Date;

  @Prop({ type: Date })
  verifiedAt?: Date;
}

export const PerformancePredictionSchema = SchemaFactory.createForClass(PerformancePrediction);
