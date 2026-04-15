/**
 * Run once to seed competitions into MongoDB. Idempotent (skips existing names).
 * Usage: from backend folder: npm run seed:competitions
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose, { Types } from 'mongoose';
import { SEED_COMPETITIONS } from '../src/competitions/seed-competitions.data';

const CompetitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['code_golf', 'speed', 'algorithmic'], required: true },
    status: { type: String, enum: ['scheduled', 'active', 'closed', 'archived'], default: 'scheduled' },
    challengeIds: { type: [mongoose.Schema.Types.ObjectId], ref: 'Challenge', required: true, default: [] },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    supportedLanguages: { type: [String], enum: ['javascript', 'python', 'java', 'cpp'], default: ['javascript', 'python', 'java', 'cpp'] },
    rules: { type: String, default: '' },
    participants: { type: [String], default: [] },
    prizes: { type: [String], default: [] },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'medium' },
  },
  { timestamps: true },
);

const CompetitionModel = mongoose.model('Competition', CompetitionSchema);
const ChallengeModel = mongoose.model(
  'Challenge',
  new mongoose.Schema(
    {
      title: String,
      difficulty: String,
      isPublished: Boolean,
    },
    { timestamps: true },
  ),
);

function pickChallengeIdsByDifficulty(
  difficulty: 'easy' | 'medium' | 'hard' | 'expert',
  challengeIdsByDifficulty: Record<string, Types.ObjectId[]>,
): Types.ObjectId[] {
  const same = challengeIdsByDifficulty[difficulty] || [];
  if (same.length > 0) return [same[0]];

  // Fallback order when exact difficulty is unavailable
  const fallbackOrder = ['medium', 'easy', 'hard', 'expert'];
  for (const key of fallbackOrder) {
    const list = challengeIdsByDifficulty[key] || [];
    if (list.length > 0) return [list[0]];
  }
  return [];
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');

    let insertedCount = 0;
    let skippedCount = 0;
    let patchedCount = 0;

    const challenges = await ChallengeModel.find({ isPublished: true })
      .select('_id difficulty')
      .lean()
      .exec();
    if (!challenges.length) {
      console.error('❌ No published challenges found. Run npm run seed:challenges first.');
      process.exit(1);
    }
    const challengeIdsByDifficulty: Record<string, Types.ObjectId[]> = {
      easy: [],
      medium: [],
      hard: [],
      expert: [],
    };
    for (const ch of challenges as Array<{ _id: Types.ObjectId; difficulty?: string }>) {
      const d = (ch.difficulty || 'medium').toLowerCase();
      if (!challengeIdsByDifficulty[d]) challengeIdsByDifficulty[d] = [];
      challengeIdsByDifficulty[d].push(ch._id);
    }

    for (const compData of SEED_COMPETITIONS) {
      const linkedChallengeIds = pickChallengeIdsByDifficulty(
        (compData.difficulty as any) || 'medium',
        challengeIdsByDifficulty,
      );

      const exists = await CompetitionModel.findOne({ name: compData.name });
      if (exists) {
        const hasLinkedChallenges = Array.isArray((exists as any).challengeIds) && (exists as any).challengeIds.length > 0;
        if (!hasLinkedChallenges && linkedChallengeIds.length > 0) {
          await CompetitionModel.updateOne(
            { _id: (exists as any)._id },
            { $set: { challengeIds: linkedChallengeIds } },
          ).exec();
          console.log(`  ↻ Patched: "${compData.name}" (linked 1 challenge)`);
          patchedCount++;
          continue;
        }
        console.log(`  ⊘ Skipped: "${compData.name}" (already exists)`);
        skippedCount++;
      } else {
        await CompetitionModel.create({
          ...compData,
          challengeIds: linkedChallengeIds,
        });
        console.log(`  ✓ Added: "${compData.name}"`);
        insertedCount++;
      }
    }

    console.log(`\n📊 Seed Summary:`);
    console.log(`  Inserted: ${insertedCount} new competitions`);
    console.log(`  Patched: ${patchedCount} competitions missing challengeIds`);
    console.log(`  Skipped: ${skippedCount} existing competitions`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

run();
