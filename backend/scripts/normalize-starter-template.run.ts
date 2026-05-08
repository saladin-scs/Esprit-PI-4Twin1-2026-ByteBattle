import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type Language = 'javascript' | 'python' | 'java' | 'cpp';

const ALL_LANGUAGES: Language[] = ['javascript', 'python', 'java', 'cpp'];

const TEMPLATE_STARTER: Record<Language, string> = {
  javascript: [
    "const fs = require('fs');",
    "const input = fs.readFileSync(0, 'utf8');",
    '// TODO: implement your solution',
    "// Current starter intentionally returns a placeholder result.",
    "process.stdout.write('TODO');",
  ].join('\n'),
  python: [
    'import sys',
    'input_data = sys.stdin.read()',
    '# TODO: implement your solution',
    '# Current starter intentionally returns a placeholder result.',
    "sys.stdout.write('TODO')",
  ].join('\n'),
  java: [
    'import java.io.*;',
    '',
    'public class Solution {',
    '  public static void main(String[] args) throws Exception {',
    '    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));',
    '    StringBuilder input = new StringBuilder();',
    '    String line;',
    '    while ((line = br.readLine()) != null) {',
    "      input.append(line).append('\\n');",
    '    }',
    '    // TODO: implement your solution',
    '    // Current starter intentionally returns a placeholder result.',
    '    System.out.print("TODO");',
    '  }',
    '}',
  ].join('\n'),
  cpp: [
    '#include <iostream>',
    '#include <string>',
    'using namespace std;',
    '',
    'int main() {',
    '  string input, line;',
    '  while (getline(cin, line)) {',
    "    input += line + '\\n';",
    '  }',
    '  // TODO: implement your solution',
    '  // Current starter intentionally returns a placeholder result.',
    '  cout << "TODO";',
    '  return 0;',
    '}',
  ].join('\n'),
};

const ChallengeSchema = new Schema(
  {
    title: String,
    languages: [String],
    starterCode: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing in backend/.env');
  }

  await mongoose.connect(uri);

  const challenges = await ChallengeModel.find({}).select('_id title').lean().exec();
  let updated = 0;

  for (const c of challenges as Array<{ _id: unknown; title: string }>) {
    await ChallengeModel.updateOne(
      { _id: c._id },
      {
        $set: {
          starterCode: TEMPLATE_STARTER,
          languages: ALL_LANGUAGES,
        },
      },
    ).exec();
    updated++;
  }

  console.log(`Starter templates applied to ${updated} challenges.`);
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
