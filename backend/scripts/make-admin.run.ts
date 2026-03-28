/**
 * Promote a user to admin by email.
 * Usage (from backend/): npx ts-node scripts/make-admin.run.ts you@email.com
 * Or: npm run make-admin -- khalfaouisaladin@gmail.com
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';

const email = (process.argv[2] || 'khalfaouisaladin@gmail.com').toLowerCase().trim();

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('Missing MONGODB_URI (or DATABASE_URL) in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('users');
  const res = await col.updateOne(
    { email },
    { $set: { roles: ['admin'], isAdmin: true } },
  );
  if (res.matchedCount === 0) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }
  console.log(`OK — ${email} is now admin (modified: ${res.modifiedCount})`);
  console.log('Le backend recharge les rôles depuis Mongo à chaque requête JWT : pas besoin de se reconnecter.');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
