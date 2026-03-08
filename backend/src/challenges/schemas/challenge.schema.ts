/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChallengeDocument = Challenge & Document;

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Language = 'javascript' | 'python' | 'java' | 'cpp';

@Schema({ timestamps: true })
export class Challenge {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  // Exemples affichés à l'utilisateur
  @Prop({
    type: [{ input: String, output: String, explanation: String }],
    default: [],
  })
  examples: Array<{ input: string; output: string; explanation?: string }>;

  // Tests cachés pour la correction automatique
  @Prop({
    type: [{ 
      input: String, 
      expectedOutput: String, 
      isHidden: { type: Boolean, default: true },
      isPerformance: { type: Boolean, default: false }
    }],
    default: [],
    select: false, // ← jamais exposé au frontend par défaut
  })
  testCases: Array<{ input: string; expectedOutput: string; isHidden?: boolean; isPerformance?: boolean }>;

  @Prop({ enum: ['easy', 'medium', 'hard', 'expert'], default: 'easy' })
  difficulty: Difficulty;

  @Prop({ type: [String], enum: ['javascript', 'python', 'java', 'cpp'], default: ['javascript', 'python'] })
  languages: Language[];

  // Code de départ pour chaque langage
  @Prop({ type: Object, default: () => ({}) })
  starterCode: Record<Language, string>;

  // Tags (ex: "arrays", "recursion", "dp"...)
  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: 0 })
  xpReward: number;

  @Prop({ default: 0 })
  totalSubmissions: number;

  @Prop({ default: 0 })
  totalAccepted: number;

  @Prop({ default: true })
  isPublished: boolean;

  // Contraintes affichées (ex: "1 <= n <= 10^5")
  @Prop({ type: [String], default: [] })
  constraints: string[];

  // Time Limit in milliseconds
  @Prop({ type: Number, default: 2000 })
  timeLimit: number;

  // Memory Limit in MB
  @Prop({ type: Number, default: 256 })
  memoryLimit: number;

  // Cover Image
  @Prop({ type: String, required: false })
  coverImage?: string;

  // Hints
  @Prop({
    type: [{ text: String, tier: String, cost: Number }],
    default: [],
  })
  hints: Array<{ text: string; tier: 'basic' | 'detailed' | 'premium'; cost: number }>;
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);

// Index pour recherche rapide
ChallengeSchema.index({ difficulty: 1, isPublished: 1 });
ChallengeSchema.index({ tags: 1 });