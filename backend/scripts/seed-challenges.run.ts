/**
 * Run once to seed challenges into MongoDB. Idempotent (skips existing titles).
 * Usage: from backend folder: npx ts-node -r tsconfig-paths/register scripts/seed-challenges.run.ts
 * Or: npm run seed:challenges
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';
import { SEED_CHALLENGES } from '../src/challenges/seed-challenges.data';

const XP_MAP: Record<string, number> = { easy: 50, medium: 100, hard: 200, expert: 400 };

const ChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    examples: [{ input: String, output: String, explanation: String }],
    testCases: [
      {
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: true },
        isPerformance: { type: Boolean, default: false },
      },
    ],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'easy' },
    languages: { type: [String], enum: ['javascript', 'python', 'java', 'cpp'], default: ['javascript', 'python'] },
    starterCode: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    xpReward: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    constraints: { type: [String], default: [] },
    timeLimit: { type: Number, default: 2000 },
    memoryLimit: { type: Number, default: 256 },
    hints: [{ text: String, tier: String, cost: Number }],
  },
  { timestamps: true },
);

const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  let created = 0;
  let skipped = 0;
  for (const data of SEED_CHALLENGES) {
    const exists = await ChallengeModel.findOne({ title: data.title }).select('_id').lean().exec();
    if (exists) {
      skipped++;
      console.log(`Skip (exists): ${data.title}`);
      continue;
    }
    await ChallengeModel.create({
      ...data,
      xpReward: XP_MAP[data.difficulty] ?? 100,
      constraints: [],
      isPublished: true,
    });
    created++;
    console.log(`Created: ${data.title} (${data.difficulty})`);
  }
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
