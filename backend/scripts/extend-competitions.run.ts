import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const CompetitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    status: { type: String, enum: ['scheduled', 'active', 'closed', 'archived'], default: 'scheduled' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
  },
  { timestamps: true },
);

const CompetitionModel = mongoose.model('Competition', CompetitionSchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in backend/.env');
    process.exit(1);
  }

  const days = Math.max(1, Number(process.env.COMPETITIONS_EXTEND_DAYS || 30));
  const deltaMs = days * 24 * 60 * 60 * 1000;
  const now = new Date();

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Extending competitions by ${days} day(s)...`);

  const competitions = await CompetitionModel.find({
    status: { $in: ['scheduled', 'active', 'closed'] },
  })
    .select('_id name status startTime endTime')
    .lean()
    .exec();

  let updated = 0;
  for (const comp of competitions) {
    const oldEnd = new Date(comp.endTime);
    const newEnd = new Date(oldEnd.getTime() + deltaMs);
    let nextStatus = comp.status;

    if (nextStatus === 'closed' && newEnd > now) {
      nextStatus = 'active';
    }

    await CompetitionModel.updateOne(
      { _id: comp._id },
      { $set: { endTime: newEnd, status: nextStatus } },
    ).exec();

    updated++;
    console.log(
      `- ${comp.name}: ${oldEnd.toISOString()} -> ${newEnd.toISOString()} (${comp.status} -> ${nextStatus})`,
    );
  }

  console.log(`Updated ${updated} competition(s).`);
  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error('Failed to extend competitions:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});

