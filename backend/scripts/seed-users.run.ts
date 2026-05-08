/**
 * Seed a deterministic set of demo users.
 * Idempotent: upserts by email.
 * Usage (from backend/): npm run seed:users
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true, select: false },
    displayName: String,
    firstName: String,
    lastName: String,
    bio: String,
    country: String,
    avatarUrl: String,
    coverImage: String,
    xp: { type: Number, default: 0 },
    rankTier: { type: String, default: 'F' },
    rating: { type: Number, default: 0 },
    totalChallengesSolved: { type: Number, default: 0 },
    totalBattlesWon: { type: Number, default: 0 },
    competitionsParticipated: { type: Number, default: 0 },
    achievements: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    roles: { type: [String], default: ['user'] },
    emailVerifiedAt: { type: Date, default: Date.now },
    profilePublic: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const UserModel = mongoose.model('User', UserSchema);

const DEMO_USERS = [
  {
    email: 'admin@bytebattle.com',
    username: 'admin',
    password: 'password123',
    displayName: 'ByteBattle Admin',
    firstName: 'ByteBattle',
    lastName: 'Admin',
    bio: 'Platform administrator and demo account.',
    country: 'Tunisia',
    xp: 4200,
    rankTier: 'S',
    rating: 1900,
    totalChallengesSolved: 42,
    totalBattlesWon: 8,
    competitionsParticipated: 6,
    achievements: ['admin', 'moderator'],
    isAdmin: true,
    roles: ['admin'],
    emailVerifiedAt: new Date(),
  },
  {
    email: 'sarah.ali@bytebattle.dev',
    username: 'sarahali',
    password: 'password123',
    displayName: 'Sarah Ali',
    firstName: 'Sarah',
    lastName: 'Ali',
    bio: 'Competitive coder focused on algorithms and speed.',
    country: 'Morocco',
    xp: 2750,
    rankTier: 'A',
    rating: 1680,
    totalChallengesSolved: 28,
    totalBattlesWon: 11,
    competitionsParticipated: 7,
    achievements: ['streak-7', 'early-bird'],
  },
  {
    email: 'amine.benali@bytebattle.dev',
    username: 'aminebenali',
    password: 'password123',
    displayName: 'Amine Ben Ali',
    firstName: 'Amine',
    lastName: 'Ben Ali',
    bio: 'Backend engineer and battle arena regular.',
    country: 'Algeria',
    xp: 1840,
    rankTier: 'B',
    rating: 1530,
    totalChallengesSolved: 19,
    totalBattlesWon: 6,
    competitionsParticipated: 5,
    achievements: ['battle-winner'],
  },
  {
    email: 'lina.haddad@bytebattle.dev',
    username: 'linahaddad',
    password: 'password123',
    displayName: 'Lina Haddad',
    firstName: 'Lina',
    lastName: 'Haddad',
    bio: 'Frontend specialist who likes clean UI and fast solutions.',
    country: 'France',
    xp: 1320,
    rankTier: 'C',
    rating: 1410,
    totalChallengesSolved: 14,
    totalBattlesWon: 4,
    competitionsParticipated: 4,
    achievements: ['ui-master'],
  },
  {
    email: 'youssef.cherif@bytebattle.dev',
    username: 'youssefcherif',
    password: 'password123',
    displayName: 'Youssef Cherif',
    firstName: 'Youssef',
    lastName: 'Cherif',
    bio: 'Learner profile used for notifications and challenge progress tests.',
    country: 'Tunisia',
    xp: 640,
    rankTier: 'D',
    rating: 1280,
    totalChallengesSolved: 7,
    totalBattlesWon: 1,
    competitionsParticipated: 2,
    achievements: [],
    emailVerifiedAt: new Date(),
  },
];

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI missing in backend/.env');
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let created = 0;
  let updated = 0;

  for (const demoUser of DEMO_USERS) {
    const hashedPassword = await bcrypt.hash(demoUser.password, 10);
    const filter = { email: demoUser.email.toLowerCase() };
    const update = {
      $set: {
        ...demoUser,
        email: demoUser.email.toLowerCase(),
        password: hashedPassword,
        isActive: true,
        emailVerifiedAt: (demoUser as { emailVerifiedAt?: Date }).emailVerifiedAt || new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    const res = await UserModel.updateOne(filter, update, { upsert: true }).exec();
    if ((res as any).upsertedCount > 0) created++;
    else if ((res as any).modifiedCount > 0) updated++;
  }

  console.log(`Seeded users: created ${created}, updated ${updated}, total ${DEMO_USERS.length}.`);
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