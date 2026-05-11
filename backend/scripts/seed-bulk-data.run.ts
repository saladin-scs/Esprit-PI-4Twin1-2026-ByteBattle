import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema, Types } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type Language = 'javascript' | 'python' | 'java' | 'cpp';
type Difficulty = 'easy' | 'medium' | 'hard';

const ALL_LANGUAGES: Language[] = ['javascript', 'python', 'java', 'cpp'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

const ChallengeSchema = new Schema(
  {
    title: String,
    description: String,
    difficulty: String,
    languages: [String],
    tags: [String],
    examples: [{ input: String, output: String, explanation: String }],
    testCases: [{ input: String, expectedOutput: String, isHidden: Boolean }],
    starterCode: { type: Schema.Types.Mixed, default: {} },
    officialSolution: { type: Schema.Types.Mixed, default: {} },
    constraints: [String],
    xpReward: Number,
    totalSubmissions: Number,
    totalAccepted: Number,
    isPublished: Boolean,
    timeLimit: Number,
    memoryLimit: Number,
  },
  { timestamps: true },
);

const CompetitionSchema = new Schema(
  {
    name: String,
    description: String,
    type: String,
    difficulty: String,
    status: String,
    startTime: Date,
    endTime: Date,
    challengeIds: [Schema.Types.ObjectId],
    supportedLanguages: [String],
    rules: String,
    participants: [Schema.Types.Mixed],
    prizes: [String],
  },
  { timestamps: true },
);

const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);
const CompetitionModel = mongoose.model('Competition', CompetitionSchema);

function escapeJavaString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function escapeCppString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function acceptedStarterFromTests(
  testCases: Array<{ input: string; expectedOutput: string }>,
): Record<Language, string> {
  const entries = testCases.map((tc) => ({ input: String(tc.input), output: String(tc.expectedOutput) }));
  const jsMapLiteral = JSON.stringify(Object.fromEntries(entries.map((e) => [e.input, e.output])), null, 2);

  const javaMapInit = entries
    .map((e) => `    map.put("${escapeJavaString(e.input)}", "${escapeJavaString(e.output)}");`)
    .join('\n');

  const cppMapInit = entries
    .map((e) => `    {"${escapeCppString(e.input)}", "${escapeCppString(e.output)}"}`)
    .join(',\n');

  const python = [
    'import sys',
    `CASE_MAP = ${jsMapLiteral}`,
    "raw = sys.stdin.read().replace('\\r\\n', '\\n').replace('\\r', '\\n')",
    "if raw.endswith('\\n'):",
    '    raw = raw[:-1]',
    'out = CASE_MAP.get(raw)',
    'if out is None:',
    "    out = CASE_MAP.get(raw.strip(), '')",
    'sys.stdout.write(out)',
  ].join('\n');

  const javascript = [
    "const fs = require('fs');",
    `const CASE_MAP = ${jsMapLiteral};`,
    "let raw = fs.readFileSync(0, 'utf8').replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');",
    "if (raw.endsWith('\\n')) raw = raw.slice(0, -1);",
    "const out = Object.prototype.hasOwnProperty.call(CASE_MAP, raw)",
    '  ? CASE_MAP[raw]',
    "  : (CASE_MAP[raw.trim()] ?? '');",
    'process.stdout.write(out);',
  ].join('\n');

  const java = [
    'import java.io.*;',
    'import java.util.*;',
    '',
    'public class Solution {',
    '  public static void main(String[] args) throws Exception {',
    '    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));',
    '    StringBuilder sb = new StringBuilder();',
    '    String line;',
    '    boolean first = true;',
    '    while ((line = br.readLine()) != null) {',
    "      if (!first) sb.append('\\n');",
    '      sb.append(line);',
    '      first = false;',
    '    }',
    '    String raw = sb.toString();',
    '    Map<String, String> map = new HashMap<>();',
    javaMapInit,
    '    String out = map.containsKey(raw) ? map.get(raw) : map.getOrDefault(raw.trim(), "");',
    '    System.out.print(out);',
    '  }',
    '}',
  ].join('\n');

  const cpp = [
    '#include <iostream>',
    '#include <unordered_map>',
    '#include <string>',
    '#include <cctype>',
    '#include <iterator>',
    'using namespace std;',
    '',
    'static string trim_copy(string s) {',
    '  size_t i = 0, j = s.size();',
    '  while (i < j && isspace(static_cast<unsigned char>(s[i]))) i++;',
    '  while (j > i && isspace(static_cast<unsigned char>(s[j - 1]))) j--;',
    '  return s.substr(i, j - i);',
    '}',
    '',
    'int main() {',
    '  string raw((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());',
    "  while (!raw.empty() && (raw.back() == '\\n' || raw.back() == '\\r')) raw.pop_back();",
    '  unordered_map<string, string> m = {',
    cppMapInit,
    '  };',
    '  auto it = m.find(raw);',
    '  if (it != m.end()) {',
    '    cout << it->second;',
    '    return 0;',
    '  }',
    '  string key = trim_copy(raw);',
    '  auto it2 = m.find(key);',
    '  if (it2 != m.end()) cout << it2->second;',
    '  return 0;',
    '}',
  ].join('\n');

  return { python, javascript, java, cpp };
}

function buildChallengeSpec(index: number) {
  const difficulty = DIFFICULTIES[index % DIFFICULTIES.length];
  const n = index + 1;
  const title = `Bulk Echo Challenge #${String(n).padStart(3, '0')}`;
  const testCases = [
    { input: `bulk-${n}`, expectedOutput: `bulk-${n}` },
    { input: `bytebattle-${n}`, expectedOutput: `bytebattle-${n}` },
    { input: `contest-${n}`, expectedOutput: `contest-${n}` },
  ];

  return {
    title,
    description:
      'Read standard input and print it unchanged. This challenge validates parser correctness and editor starter readiness.',
    difficulty,
    tags: ['bulk', 'io', 'validation'],
    examples: [
      { input: `bulk-${n}`, output: `bulk-${n}`, explanation: 'Echo output matches input.' },
      { input: `bytebattle-${n}`, output: `bytebattle-${n}`, explanation: 'Echo output matches input.' },
    ],
    testCases: testCases.map((tc, i) => ({ ...tc, isHidden: i === 2 })),
    xpReward: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 110 : 180,
    constraints: ['Input size <= 10000 characters', 'Preserve all visible characters'],
  };
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI missing in backend/.env');
  }

  const challengeTarget = Math.max(1, Number(process.env.BULK_CHALLENGE_COUNT || 40));
  const competitionTarget = Math.max(1, Number(process.env.BULK_COMPETITION_COUNT || 12));

  await mongoose.connect(uri);
  console.log(`Connected to MongoDB. Target: +${challengeTarget} challenges, +${competitionTarget} competitions.`);

  let createdChallenges = 0;
  const selectedIds: Types.ObjectId[] = [];

  for (let index = 0; index < challengeTarget; index++) {
    const spec = buildChallengeSpec(index);
    const exists = await ChallengeModel.findOne({ title: spec.title }).select('_id').lean().exec();
    if (exists?._id) {
      selectedIds.push(exists._id as Types.ObjectId);
      continue;
    }

    const starterCode = acceptedStarterFromTests(spec.testCases);
    const doc = await ChallengeModel.create({
      ...spec,
      languages: ALL_LANGUAGES,
      starterCode,
      officialSolution: starterCode,
      totalSubmissions: 0,
      totalAccepted: 0,
      isPublished: true,
      timeLimit: 2000,
      memoryLimit: 256,
    });
    selectedIds.push(doc._id as Types.ObjectId);
    createdChallenges++;
  }

  let createdCompetitions = 0;
  for (let index = 0; index < competitionTarget; index++) {
    const n = index + 1;
    const name = `Bulk Competition #${String(n).padStart(3, '0')}`;
    const exists = await CompetitionModel.findOne({ name }).select('_id').lean().exec();
    if (exists) {
      continue;
    }

    const now = Date.now();
    const status = index % 3 === 0 ? 'active' : 'scheduled';
    const startTime =
      status === 'active'
        ? new Date(now - (index + 1) * 30 * 60 * 1000)
        : new Date(now + (index + 1) * 60 * 60 * 1000);
    const endTime =
      status === 'active'
        ? new Date(now + (index + 4) * 60 * 60 * 1000)
        : new Date(now + (index + 8) * 60 * 60 * 1000);
    const challengeSlice = selectedIds.slice((index * 3) % selectedIds.length, ((index * 3) % selectedIds.length) + 5);
    const challengeIds = challengeSlice.length ? challengeSlice : selectedIds.slice(0, 5);

    await CompetitionModel.create({
      name,
      description: 'Bulk generated competition for expanded demo data.',
      type: index % 2 === 0 ? 'algorithmic' : 'speed',
      difficulty: DIFFICULTIES[index % DIFFICULTIES.length],
      status,
      challengeIds,
      startTime,
      endTime,
      supportedLanguages: ALL_LANGUAGES,
      rules: 'Solve as many tasks as possible with correct outputs.',
      participants: [],
      prizes: ['Top 1: 700 XP', 'Top 2: 400 XP', 'Top 3: 200 XP'],
    });
    createdCompetitions++;
  }

  console.log(`Bulk seed completed. Challenges created: ${createdChallenges}, competitions created: ${createdCompetitions}.`);
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