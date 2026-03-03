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
    type: [{ input: String, expectedOutput: String }],
    default: [],
    select: false, // ← jamais exposé au frontend
  })
  testCases: Array<{ input: string; expectedOutput: string }>;

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
}

export const ChallengeSchema = SchemaFactory.createForClass(Challenge);

// Index pour recherche rapide
ChallengeSchema.index({ difficulty: 1, isPublished: 1 });
ChallengeSchema.index({ tags: 1 });