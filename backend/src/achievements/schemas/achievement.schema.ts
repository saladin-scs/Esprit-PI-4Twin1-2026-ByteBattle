import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AchievementDocument = Achievement & Document;

@Schema({ timestamps: true })
export class Achievement {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  icon: string;

  @Prop({ required: true })
  type: string; // 'challenge', 'battle', 'streak', etc.

  @Prop()
  requirement?: number;
}

export const AchievementSchema = SchemaFactory.createForClass(Achievement);
