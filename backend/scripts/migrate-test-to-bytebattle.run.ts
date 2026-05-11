import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';
import { normalizeMongoUri } from '../src/config/mongo-uri';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

function deriveTestUri(targetUri: string): string {
  try {
    const parsed = new URL(targetUri);
    parsed.pathname = '/test';
    return parsed.toString();
  } catch {
    return targetUri.replace(/\/bytebattle(\?|$)/, '/test$1');
  }
}

async function copyCollection(sourceDb: mongoose.Connection['db'], targetDb: mongoose.Connection['db'], collectionName: string) {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  const docs = await sourceCollection.find({}).toArray();

  if (!docs.length) {
    console.log(`- ${collectionName}: no documents to copy`);
    return { copied: 0 };
  }

  const operations = docs.map((doc) => ({
    replaceOne: {
      filter: { _id: doc._id },
      replacement: doc,
      upsert: true,
    },
  }));

  const result = await targetCollection.bulkWrite(operations, { ordered: false });
  const copied = result.upsertedCount + result.modifiedCount;
  console.log(`- ${collectionName}: copied ${copied}/${docs.length}`);
  return { copied, total: docs.length };
}

async function run() {
  const targetUri = normalizeMongoUri(process.env.MONGODB_URI, 'bytebattle');
  if (!targetUri) {
    throw new Error('MONGODB_URI missing in backend/.env');
  }

  const sourceUri = normalizeMongoUri(process.env.MONGODB_SOURCE_URI || deriveTestUri(targetUri), 'test');

  const sourceConn = await mongoose.createConnection(sourceUri).asPromise();
  const targetConn = await mongoose.createConnection(targetUri).asPromise();

  console.log('Connected to source (test) and target (bytebattle) databases');

  try {
    const sourceCollections = await sourceConn.db.listCollections().toArray();
    const collectionNames = sourceCollections
      .map((item) => item.name)
      .filter((name) => !name.startsWith('system.'))
      .sort();

    if (collectionNames.length === 0) {
      console.log('No collections found in source database test. Nothing to migrate.');
      return;
    }

    const summary: Array<{ name: string; copied: number; total: number }> = [];
    for (const collectionName of collectionNames) {
      const result = await copyCollection(sourceConn.db, targetConn.db, collectionName);
      summary.push({ name: collectionName, copied: result.copied ?? 0, total: result.total ?? 0 });
    }

    console.log('\nMigration summary:');
    for (const row of summary) {
      console.log(`  ${row.name}: ${row.copied}/${row.total}`);
    }
  } finally {
    await Promise.allSettled([sourceConn.close(), targetConn.close()]);
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});