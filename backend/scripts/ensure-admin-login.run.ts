/**
 * Ensure khalfaouisaladin@gamil.com can log in as admin:
 * - If user exists only as @gmail.com, renames email to @gamil.com (same password).
 * - Sets admin, active, email verified.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';

const TARGET = 'khalfaouisaladin@gamil.com';
const ALT = 'khalfaouisaladin@gmail.com';

async function main() {
  const uri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!uri) {
    console.error('Missing MONGODB_URI in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const col = mongoose.connection.collection('users');

  const atTarget = await col.findOne({ email: TARGET });
  const atGmail = await col.findOne({ email: ALT });

  if (atTarget) {
    await col.updateOne(
      { _id: atTarget._id },
      {
        $set: {
          roles: ['admin'],
          isAdmin: true,
          isActive: true,
          emailVerifiedAt: atTarget.emailVerifiedAt || new Date(),
        },
      },
    );
    console.log(`OK — ${TARGET} updated (admin, active, verified).`);
  } else if (atGmail) {
    await col.updateOne(
      { _id: atGmail._id },
      {
        $set: {
          email: TARGET,
          roles: ['admin'],
          isAdmin: true,
          isActive: true,
          emailVerifiedAt: atGmail.emailVerifiedAt || new Date(),
        },
      },
    );
    console.log(`OK — email changed ${ALT} → ${TARGET} (same password). Log in with ${TARGET}`);
  } else {
    console.error(`No user with ${TARGET} or ${ALT}. Register first in the main app.`);
    process.exit(1);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
