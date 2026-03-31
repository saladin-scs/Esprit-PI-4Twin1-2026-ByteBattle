/**
 * Run once to seed competitions into MongoDB. Idempotent (skips existing names).
 * Usage: from backend folder: npm run seed:competitions
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';
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

    for (const compData of SEED_COMPETITIONS) {
      const exists = await CompetitionModel.findOne({ name: compData.name });
      if (exists) {
        console.log(`  ⊘ Skipped: "${compData.name}" (already exists)`);
        skippedCount++;
      } else {
        await CompetitionModel.create(compData);
        console.log(`  ✓ Added: "${compData.name}"`);
        insertedCount++;
      }
    }

    console.log(`\n📊 Seed Summary:`);
    console.log(`  Inserted: ${insertedCount} new competitions`);
    console.log(`  Skipped: ${skippedCount} existing competitions`);

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

run();
