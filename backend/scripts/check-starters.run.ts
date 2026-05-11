import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const ChallengeSchema = new Schema(
  {
    title: String,
    languages: [String],
    starterCode: { type: Schema.Types.Mixed, default: {} },
    testCases: [{ input: String, expectedOutput: String }],
  },
  { timestamps: true },
);

const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing');
  await mongoose.connect(uri);

  const docs = await ChallengeModel.find({}).select('title languages starterCode testCases').lean().exec();

  const missing: Array<{ title: string; lang: string }> = [];
  const noTests: string[] = [];
  const missingLangCoverage: Array<{ title: string; missing: string[] }> = [];

  for (const d of docs as Array<any>) {
    const sc = d.starterCode || {};
    const langs = Array.isArray(d.languages) ? d.languages.map((x: any) => String(x)) : [];
    for (const lang of ['python', 'javascript', 'java', 'cpp']) {
      if (!sc[lang] || String(sc[lang]).trim() === '') {
        missing.push({ title: d.title, lang });
      }
    }
    const missingLangs = ['python', 'javascript', 'java', 'cpp'].filter((lang) => !langs.includes(lang));
    if (missingLangs.length > 0) {
      missingLangCoverage.push({ title: d.title, missing: missingLangs });
    }
    if (!Array.isArray(d.testCases) || d.testCases.length === 0) {
      noTests.push(String(d.title));
    }
  }

  console.log(
    JSON.stringify(
      {
        total: docs.length,
        missingStarters: missing.length,
        missingSample: missing.slice(0, 10),
        missingLanguageCoverage: missingLangCoverage.length,
        missingLanguageCoverageSample: missingLangCoverage.slice(0, 10),
        noTestsCount: noTests.length,
        noTests: noTests.slice(0, 10),
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

run()
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    process.exit(1);
  });
