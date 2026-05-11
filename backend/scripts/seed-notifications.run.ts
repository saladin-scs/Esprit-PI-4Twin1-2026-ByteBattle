import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Types } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    meta: { type: Object, default: {} },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const UserModel = mongoose.model('User', UserSchema);
const NotificationModel = mongoose.model('Notification', NotificationSchema);

type SeedNotification = {
  type: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
};

function buildSeed(username: string): SeedNotification[] {
  return [
    {
      type: 'welcome',
      title: 'Welcome to ByteBattle',
      body: `Hi ${username}, your account is ready. Start by solving a challenge.`,
      meta: { href: '/challenges' },
    },
    {
      type: 'challenge_solved',
      title: 'Challenge solved',
      body: 'Great progress. You completed a challenge and earned XP.',
      meta: { href: '/challenges' },
    },
    {
      type: 'competition_joined',
      title: 'Competition registration',
      body: 'You are registered for an upcoming competition.',
      meta: { href: '/competitions' },
    },
    {
      type: 'battle_found',
      title: 'Battle matched',
      body: 'A new battle is ready. Open the arena and submit your best solution.',
      meta: { href: '/battle/matchmaking' },
    },
  ];
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set in backend/.env');
  }

  await mongoose.connect(uri);

  const users = await UserModel.find({})
    .select('_id username createdAt')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean()
    .exec();

  if (users.length === 0) {
    console.log('No users found. Create/login an account first.');
    await mongoose.disconnect();
    return;
  }

  let inserted = 0;

  for (const user of users as Array<{ _id: Types.ObjectId; username: string }>) {
    const payload = buildSeed(user.username).map((n) => ({
      userId: user._id,
      type: n.type,
      title: n.title,
      body: n.body,
      meta: n.meta ?? {},
      read: false,
    }));

    await NotificationModel.insertMany(payload);
    inserted += payload.length;
  }

  console.log(`Seeded ${inserted} notifications for ${users.length} users.`);
  await mongoose.disconnect();
}

run().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
