import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema, Types } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserSchema = new Schema(
  {
    email: String,
    username: String,
  },
  { timestamps: true },
);

const ChallengeSchema = new Schema(
  {
    title: String,
  },
  { timestamps: true },
);

const CompetitionSchema = new Schema(
  {
    name: String,
  },
  { timestamps: true },
);

const ChatMessageSchema = new Schema(
  {
    room: String,
    userId: { type: Types.ObjectId, ref: 'User' },
    username: String,
    body: String,
  },
  { timestamps: true },
);

const ChatMessageReportSchema = new Schema(
  {
    messageId: { type: Types.ObjectId, ref: 'ChatMessage' },
    room: String,
    reporterUserId: { type: Types.ObjectId, ref: 'User' },
    reportedUserId: { type: Types.ObjectId, ref: 'User' },
    bodySnapshot: String,
    reason: String,
    status: String,
  },
  { timestamps: true },
);

const ChallengeSessionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true },
    challengeId: { type: Types.ObjectId, ref: 'Challenge', index: true },
    startedAt: Date,
    revealedHintIndices: [Number],
  },
  { timestamps: true },
);

ChallengeSessionSchema.index({ userId: 1, challengeId: 1 }, { unique: true });

const CompetitionSubmissionSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true },
    competitionId: { type: Types.ObjectId, ref: 'Competition', index: true },
    challengeId: { type: Types.ObjectId, ref: 'Challenge', index: true },
    code: String,
    language: String,
    status: String,
    score: Number,
    executionTimeMs: Number,
    passedTests: Number,
    totalTests: Number,
    isBest: Boolean,
  },
  { timestamps: true },
);

const SiteRatingSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', index: true },
    stars: Number,
  },
  { timestamps: true },
);

const SecurityEventSchema = new Schema(
  {
    type: String,
    userId: String,
    ip: String,
    userAgent: String,
    metadata: Schema.Types.Mixed,
  },
  { timestamps: true },
);

const UserModel = mongoose.model<any>('User', UserSchema);
const ChallengeModel = mongoose.model<any>('Challenge', ChallengeSchema);
const CompetitionModel = mongoose.model<any>('Competition', CompetitionSchema);
const ChatMessageModel = mongoose.model<any>('ChatMessage', ChatMessageSchema);
const ChatMessageReportModel = mongoose.model<any>('ChatMessageReport', ChatMessageReportSchema);
const ChallengeSessionModel = mongoose.model<any>('ChallengeSession', ChallengeSessionSchema);
const CompetitionSubmissionModel = mongoose.model<any>('CompetitionSubmission', CompetitionSubmissionSchema);
const SiteRatingModel = mongoose.model<any>('SiteRating', SiteRatingSchema);
const SecurityEventModel = mongoose.model<any>('SecurityEvent', SecurityEventSchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI missing in backend/.env');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const users = await UserModel.find({}).select('_id email username').sort({ createdAt: 1 }).limit(5).lean().exec();
  const challenges = await ChallengeModel.find({}).select('_id title languages').sort({ createdAt: 1 }).limit(6).lean().exec();
  const competitions = await CompetitionModel.find({}).select('_id name').sort({ createdAt: 1 }).limit(4).lean().exec();

  if (users.length < 2 || challenges.length < 1 || competitions.length < 1) {
    throw new Error('Need existing users, challenges, and competitions before seeding missing demo data.');
  }

  let chatMessagesCreated = 0;
  let reportsCreated = 0;
  let sessionsCreated = 0;
  let competitionSubmissionsCreated = 0;
  let ratingsCreated = 0;
  let securityEventsCreated = 0;

  const room = 'general';
  const chatSeeds = [
    {
      user: users[0],
      body: 'Seeded chat message for Atlas demo data.',
    },
    {
      user: users[1],
      body: 'Second seeded message to populate chatmessages.',
    },
  ];

  const insertedChatMessages: Array<{ _id: Types.ObjectId; body: string; room: string }> = [];
  for (const seed of chatSeeds) {
    const filter = { room, userId: seed.user._id, body: seed.body };
    const existing = (await ChatMessageModel.findOne(filter).select('_id').lean().exec()) as any;
    if (existing) {
      insertedChatMessages.push({ _id: existing._id as Types.ObjectId, body: seed.body, room });
      continue;
    }

    const created = await ChatMessageModel.create({
      room,
      userId: seed.user._id,
      username: seed.user.username,
      body: seed.body,
    });
    insertedChatMessages.push({ _id: created._id as Types.ObjectId, body: seed.body, room });
    chatMessagesCreated++;
  }

  const reportExists = await ChatMessageReportModel.findOne({
    messageId: insertedChatMessages[0]._id,
    reporterUserId: users[1]._id,
    reportedUserId: users[0]._id,
  })
    .select('_id')
    .lean()
    .exec();

  if (!reportExists) {
    await ChatMessageReportModel.create({
      messageId: insertedChatMessages[0]._id,
      room,
      reporterUserId: users[1]._id,
      reportedUserId: users[0]._id,
      bodySnapshot: insertedChatMessages[0].body,
      reason: 'demo-review',
      status: 'open',
    });
    reportsCreated++;
  }

  for (const user of users.slice(0, 3)) {
    const filter = { userId: user._id };
    const exists = await SiteRatingModel.findOne(filter).select('_id').lean().exec();
    if (exists) continue;

    await SiteRatingModel.create({
      userId: user._id,
      stars: user === users[0] ? 5 : user === users[1] ? 4 : 5,
    });
    ratingsCreated++;
  }

  const sessionPairs = [
    { user: users[0], challenge: challenges[0] },
    { user: users[1], challenge: challenges[1] ?? challenges[0] },
  ];

  for (const pair of sessionPairs) {
    const result = await ChallengeSessionModel.updateOne(
      { userId: pair.user._id, challengeId: pair.challenge._id },
      {
        $setOnInsert: {
          userId: pair.user._id,
          challengeId: pair.challenge._id,
          startedAt: new Date(),
          revealedHintIndices: [0],
        },
      },
      { upsert: true },
    ).exec();
    if ((result as any).upsertedCount > 0) sessionsCreated++;
  }

  const competition = competitions[0];
  const competitionChallenge = challenges[0];
  for (const user of users.slice(0, 3)) {
    const code = `// demo-seed-v2\n// competition:${String(competition._id)}\nconsole.log('ok');`;
    const filter = { userId: user._id, competitionId: competition._id, challengeId: competitionChallenge._id, code };
    const existing = await CompetitionSubmissionModel.findOne(filter).select('_id').lean().exec();
    if (existing) continue;

    await CompetitionSubmissionModel.create({
      userId: user._id,
      competitionId: competition._id,
      challengeId: competitionChallenge._id,
      code,
      language: 'javascript',
      status: 'accepted',
      score: 120 - users.indexOf(user) * 10,
      executionTimeMs: 35 + users.indexOf(user) * 4,
      passedTests: 3,
      totalTests: 3,
      isBest: users.indexOf(user) === 0,
    });
    competitionSubmissionsCreated++;
  }

  const securitySeeds = [
    {
      type: 'login_failed',
      userId: String(users[0]._id),
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      metadata: { source: 'seed-missing-demo-data', marker: 'sec-1' },
    },
    {
      type: 'rate_limit_hit',
      userId: String(users[1]._id),
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      metadata: { source: 'seed-missing-demo-data', marker: 'sec-2' },
    },
    {
      type: 'api_key_created',
      userId: String(users[2]?._id ?? users[0]._id),
      ip: '127.0.0.1',
      userAgent: 'seed-script',
      metadata: { source: 'seed-missing-demo-data', marker: 'sec-3' },
    },
  ];

  for (const seed of securitySeeds) {
    const exists = await SecurityEventModel.findOne({ type: seed.type, 'metadata.marker': seed.metadata.marker }).select('_id').lean().exec();
    if (exists) continue;

    await SecurityEventModel.create(seed);
    securityEventsCreated++;
  }

  const [
    chatMessageCount,
    reportCount,
    sessionCount,
    compSubmissionCount,
    ratingCount,
    securityEventCount,
  ] = await Promise.all([
    ChatMessageModel.countDocuments().exec(),
    ChatMessageReportModel.countDocuments().exec(),
    ChallengeSessionModel.countDocuments().exec(),
    CompetitionSubmissionModel.countDocuments().exec(),
    SiteRatingModel.countDocuments().exec(),
    SecurityEventModel.countDocuments().exec(),
  ]);

  console.log('\nMissing demo data seed completed.');
  console.log(`Created chatmessages: ${chatMessagesCreated}`);
  console.log(`Created chatmessagereports: ${reportsCreated}`);
  console.log(`Created challengesessions: ${sessionsCreated}`);
  console.log(`Created competitionsubmissions: ${competitionSubmissionsCreated}`);
  console.log(`Created siteratings: ${ratingsCreated}`);
  console.log(`Created securityevents: ${securityEventsCreated}`);
  console.log('\nCurrent totals:');
  console.log(`- chatmessages: ${chatMessageCount}`);
  console.log(`- chatmessagereports: ${reportCount}`);
  console.log(`- challengesessions: ${sessionCount}`);
  console.log(`- competitionsubmissions: ${compSubmissionCount}`);
  console.log(`- siteratings: ${ratingCount}`);
  console.log(`- securityevents: ${securityEventCount}`);

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