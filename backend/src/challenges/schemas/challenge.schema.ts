import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChallengeDocument = Challenge & Document;

@Schema({ timestamps: true })
export class Challenge {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: ['easy', 'medium', 'hard'] })
  difficulty: string;

  @Prop({ type: Array, required: true })
  testCases: Array<{
    input: any;
    expectedOutput: any;
    isHidden: boolean;
  }>;

  @Prop()
  starterCode?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  solvedCount: number;

  @Prop({ default: 0 })
  attemptCount: number;
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);

