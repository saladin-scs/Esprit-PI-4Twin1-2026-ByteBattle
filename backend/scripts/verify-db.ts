import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const ChallengeSchema = new mongoose.Schema({
  title: String,
  starterCode: Map,
  languages: [String],
  testCases: [Object]
}, { strict: false });

async function check() {
  const conn = await mongoose.connect(process.env.MONGODB_URI);
  const ChallengeModel = conn.model('Challenge', ChallengeSchema);

  const challenges = await ChallengeModel.find().limit(5).exec();
  
  for (const c of challenges) {
    console.log(`--- Challenge: ${c.title} ---`);
    console.log('Languages:', c.languages);
    console.log('Starter Keys:', Object.keys(c.starterCode || {}));
    const s = (c.starterCode as any);
    if (s instanceof Map) {
       console.log('JS Starter snippet:', s.get('javascript')?.substring?.(0, 50) + '...');
       console.log('CPP Starter snippet:', s.get('cpp')?.substring?.(0, 50) + '...');
    } else if (s) {
       console.log('JS Starter snippet:', s.javascript?.substring?.(0, 50) + '...');
       console.log('CPP Starter snippet:', s.cpp?.substring?.(0, 50) + '...');
    }
  }
  
  await mongoose.disconnect();
}

check();
