/**
 * Seed coordinated demo activity:
 * - submissions
 * - solutions
 * - reclamations
 * - competition participants
 *
 * Idempotent: uses deterministic markers and upserts.
 *
 * Usage (from backend/):
 *   npx ts-node scripts/seed-platform-demo.run.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema, Types } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserSchema = new Schema(
  {
    email: String,
    username: String,
    roles: [String],
    isAdmin: Boolean,
  },
  { timestamps: true },
);

const ChallengeSchema = new Schema(
  {
    title: String,
    difficulty: String,
    tags: [String],
    languages: [String],
    totalSubmissions: Number,
    totalAccepted: Number,
  },
  { timestamps: true },
);

const SubmissionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User' },
    challengeId: { type: Types.ObjectId, ref: 'Challenge' },
    code: String,
    language: String,
    status: String,
    testResults: [
      {
        input: String,
        expectedOutput: String,
        actualOutput: String,
        passed: Boolean,
        error: String,
      },
    ],
    passedTests: Number,
    totalTests: Number,
    xpEarned: Number,
    executionTimeMs: Number,
  },
  { timestamps: true },
);

const SolutionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User' },
    challengeId: { type: Types.ObjectId, ref: 'Challenge' },
    code: String,
    language: String,
    explanation: String,
    timeComplexity: String,
    spaceComplexity: String,
    upvotes: Number,
    upvotedBy: [{ type: Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

const ReclamationSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User' },
    userEmail: String,
    username: String,
    category: String,
    subject: String,
    message: String,
    status: String,
  },
  { timestamps: true },
);

const CompetitionSchema = new Schema(
  {
    name: String,
    participants: [String],
  },
  { timestamps: true },
);

const UserModel = mongoose.model('User', UserSchema);
const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);
const SubmissionModel = mongoose.model('Submission', SubmissionSchema);
const SolutionModel = mongoose.model('Solution', SolutionSchema);
const ReclamationModel = mongoose.model('Reclamation', ReclamationSchema);
const CompetitionModel = mongoose.model('Competition', CompetitionSchema);

const MARKER = 'demo-seed-v1';

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI missing in backend/.env');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const users = await UserModel.find({})
    .select('_id email username')
    .sort({ createdAt: 1 })
    .limit(5)
    .lean()
    .exec();
  const challenges = await ChallengeModel.find({})
    .select('_id title difficulty languages')
    .sort({ createdAt: 1 })
    .limit(8)
    .lean()
    .exec();
  const competitions = await CompetitionModel.find({})
    .select('_id name participants')
    .sort({ createdAt: 1 })
    .limit(6)
    .lean()
    .exec();

  if (users.length < 2) throw new Error('Need at least 2 users to seed coordinated demo data.');
  if (challenges.length < 3) throw new Error('Need at least 3 challenges to seed submissions/solutions.');

  let submissionUpserts = 0;
  let solutionUpserts = 0;
  let reclamationUpserts = 0;

  const statusCycle = ['accepted', 'wrong_answer', 'accepted', 'runtime_error', 'accepted'];

  for (let i = 0; i < Math.min(users.length, 4); i++) {
    const user = users[i];
    for (let j = 0; j < Math.min(challenges.length, 4); j++) {
      const challenge = challenges[(i + j) % challenges.length];
      const lang = Array.isArray(challenge.languages) && challenge.languages.length > 0
        ? challenge.languages[0]
        : 'javascript';
      const status = statusCycle[(i + j) % statusCycle.length];
      const accepted = status === 'accepted';

      const code = `// ${MARKER}\n// user:${String(user._id)} challenge:${String(challenge._id)}\nconsole.log("seeded run");`;
      const filter = {
        userId: user._id,
        challengeId: challenge._id,
        language: lang,
        code,
      };
      const update = {
        $setOnInsert: {
          userId: user._id,
          challengeId: challenge._id,
          code,
          language: lang,
          status,
          testResults: [
            {
              input: '1 2',
              expectedOutput: '3',
              actualOutput: accepted ? '3' : '4',
              passed: accepted,
              error: accepted ? '' : 'Wrong answer',
            },
          ],
          passedTests: accepted ? 1 : 0,
          totalTests: 1,
          xpEarned: accepted ? 50 : 0,
          executionTimeMs: 12 + i + j,
        },
      };
      const res = await SubmissionModel.updateOne(filter, update, { upsert: true }).exec();
      if ((res as any).upsertedCount > 0) submissionUpserts++;
    }
  }

  for (let i = 0; i < Math.min(users.length, 4); i++) {
    const user = users[i];
    const challenge = challenges[i % challenges.length];
    const lang = Array.isArray(challenge.languages) && challenge.languages.length > 0
      ? challenge.languages[0]
      : 'javascript';

    const code = `// ${MARKER}\nfunction solve(){ return true; }`;
    const explanation = `[${MARKER}] Reference solution for "${challenge.title}" by ${user.username}.`;
    const filter = {
      userId: user._id,
      challengeId: challenge._id,
      language: lang,
      explanation,
    };
    const update = {
      $setOnInsert: {
        userId: user._id,
        challengeId: challenge._id,
        code,
        language: lang,
        explanation,
        timeComplexity: 'O(n)',
        spaceComplexity: 'O(1)',
        upvotes: 0,
        upvotedBy: [],
      },
    };
    const res = await SolutionModel.updateOne(filter, update, { upsert: true }).exec();
    if ((res as any).upsertedCount > 0) solutionUpserts++;
  }

  for (let i = 0; i < Math.min(users.length, 4); i++) {
    const user = users[i];
    const filter = {
      userId: user._id,
      subject: `[${MARKER}] Demo report #${i + 1}`,
    };
    const update = {
      $setOnInsert: {
        userId: user._id,
        userEmail: user.email,
        username: user.username,
        category: i % 2 === 0 ? 'bug' : 'content',
        subject: `[${MARKER}] Demo report #${i + 1}`,
        message: `Seeded reclamation ${i + 1} for testing admin workflows.`,
        status: 'open',
      },
    };
    const res = await ReclamationModel.updateOne(filter, update, { upsert: true }).exec();
    if ((res as any).upsertedCount > 0) reclamationUpserts++;
  }

  let participantAdds = 0;
  for (const comp of competitions) {
    for (const u of users.slice(0, 3)) {
      const res = await CompetitionModel.updateOne(
        { _id: comp._id },
        { $addToSet: { participants: u.username } },
      ).exec();
      if ((res as any).modifiedCount > 0) participantAdds++;
    }
  }

  const challengeAgg = await ChallengeModel.aggregate([
    {
      $lookup: {
        from: 'submissions',
        localField: '_id',
        foreignField: 'challengeId',
        as: 'subs',
      },
    },
    {
      $project: {
        _id: 1,
        totalSubmissions: { $size: '$subs' },
        totalAccepted: {
          $size: {
            $filter: {
              input: '$subs',
              as: 's',
              cond: { $eq: ['$$s.status', 'accepted'] },
            },
          },
        },
      },
    },
  ]).exec();

  for (const c of challengeAgg) {
    await ChallengeModel.updateOne(
      { _id: c._id },
      { $set: { totalSubmissions: c.totalSubmissions, totalAccepted: c.totalAccepted } },
    ).exec();
  }

  const [userCount, challengeCount, competitionCount, submissionCount, solutionCount, reclamationCount] =
    await Promise.all([
      UserModel.countDocuments().exec(),
      ChallengeModel.countDocuments().exec(),
      CompetitionModel.countDocuments().exec(),
      SubmissionModel.countDocuments().exec(),
      SolutionModel.countDocuments().exec(),
      ReclamationModel.countDocuments().exec(),
    ]);

  console.log('\nSeed completed.');
  console.log(`Inserted (new) submissions: ${submissionUpserts}`);
  console.log(`Inserted (new) solutions: ${solutionUpserts}`);
  console.log(`Inserted (new) reclamations: ${reclamationUpserts}`);
  console.log(`Competition participant additions: ${participantAdds}`);
  console.log('\nCurrent totals:');
  console.log(`- users: ${userCount}`);
  console.log(`- challenges: ${challengeCount}`);
  console.log(`- competitions: ${competitionCount}`);
  console.log(`- submissions: ${submissionCount}`);
  console.log(`- solutions: ${solutionCount}`);
  console.log(`- reclamations: ${reclamationCount}`);

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Seed failed:', err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });

