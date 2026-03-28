/**
 * Insert sample competitions (idempotent by name). Run after seed:challenges.
 * Usage: from backend folder: npm run seed:competitions
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';

const CompetitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: { type: String, enum: ['code_golf', 'speed', 'algorithmic'], required: true },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'closed', 'archived'],
      default: 'scheduled',
    },
    challengeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    supportedLanguages: {
      type: [String],
      enum: ['javascript', 'python', 'java', 'cpp'],
      default: ['javascript', 'python', 'java', 'cpp'],
    },
    rules: { type: String, default: '' },
    participants: { type: [String], default: [] },
  },
  { timestamps: true },
);

const ChallengeSchema = new mongoose.Schema({}, { strict: false, collection: 'challenges' });
const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);
const CompetitionModel = mongoose.model('Competition', CompetitionSchema);

type CompetitionType = 'code_golf' | 'speed' | 'algorithmic';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const challenges = await ChallengeModel.find({ isPublished: true })
    .sort({ difficulty: 1, createdAt: -1 })
    .limit(20)
    .select('_id')
    .lean()
    .exec();

  if (!challenges?.length) {
    console.error('No challenges found. Run: npm run seed:challenges');
    await mongoose.disconnect();
    process.exit(1);
  }

  const oid = (i: number) => challenges[i]._id as mongoose.Types.ObjectId;
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 14);

  const specs: Array<{
    name: string;
    description: string;
    type: CompetitionType;
    indices: number[];
    rules: string;
  }> = [
    {
      name: '[Dev] Speed Contest',
      description: 'Fastest correct solution wins. Uses the first seeded challenge.',
      type: 'speed',
      indices: [0],
      rules: 'Ranking: execution time (ms), then submission time.',
    },
    {
      name: '[Dev] Code Golf Contest',
      description: 'Shortest source code wins. Same challenge as speed contest.',
      type: 'code_golf',
      indices: [0],
      rules: 'Ranking: character count (excluding whitespace optional — server uses raw length).',
    },
  ];
  if (challenges.length >= 3) {
    specs.push({
      name: '[Dev] Algorithmic Contest',
      description: 'Multi-challenge contest using the first three challenges.',
      type: 'algorithmic',
      indices: [0, 1, 2],
      rules: 'Complete all challenges; ranking by aggregate score.',
    });
  }

  let created = 0;
  let skipped = 0;
  for (const s of specs) {
    const exists = await CompetitionModel.findOne({ name: s.name }).select('_id').lean().exec();
    if (exists) {
      skipped++;
      console.log(`Skip (exists): ${s.name}`);
      continue;
    }
    await CompetitionModel.create({
      name: s.name,
      description: s.description,
      type: s.type,
      challengeIds: s.indices.map((i) => oid(i)),
      startTime: now,
      endTime: end,
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      rules: s.rules,
      status: 'active',
      participants: [],
    });
    created++;
    console.log(`Created: ${s.name}`);
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
