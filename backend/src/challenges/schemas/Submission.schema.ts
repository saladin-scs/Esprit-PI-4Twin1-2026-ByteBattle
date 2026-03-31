/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SubmissionDocument = Submission & Document;

@Schema({ timestamps: true })
export class Submission {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Challenge', required: true, index: true })
  challengeId: Types.ObjectId;

  @Prop({ required: true })
  code: string;

  @Prop({ enum: ['javascript', 'python', 'java', 'cpp'], required: true })
  language: string;

  @Prop({ enum: ['accepted', 'wrong_answer', 'runtime_error', 'time_limit', 'pending'], default: 'pending' })
  status: string;

  // Detailed results per test case
  @Prop({
    type: [{
      input: String,
      expectedOutput: String,
      actualOutput: String,
      passed: Boolean,
      error: String,
    }],
    default: [],
  })
  testResults: Array<{
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
    error?: string;
  }>;

  @Prop({ default: 0 })
  passedTests: number;

  @Prop({ default: 0 })
  totalTests: number;

  @Prop({ default: 0 })
  xpEarned: number;

  @Prop({ default: 0 })
  executionTimeMs: number;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);