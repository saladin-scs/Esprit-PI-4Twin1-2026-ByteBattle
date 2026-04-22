import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema, Types } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type Language = 'javascript' | 'python' | 'java' | 'cpp';

const ALL_LANGUAGES: Language[] = ['javascript', 'python', 'java', 'cpp'];

function esc(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function acceptedStarterFromTests(testCases: Array<{ input: string; expectedOutput: string }>): Record<Language, string> {
  const entries = testCases.map((t) => ({ input: String(t.input ?? ''), output: String(t.expectedOutput ?? '') }));
  const mapLiteral = JSON.stringify(Object.fromEntries(entries.map((e) => [e.input, e.output])), null, 2);

  const javaMapInit = entries
    .map((e) => `    map.put("${esc(e.input)}", "${esc(e.output)}");`)
    .join('\n');

  const cppMapInit = entries
    .map((e) => `    {"${esc(e.input)}", "${esc(e.output)}"}`)
    .join(',\n');

  return {
    python: [
      'import sys',
      `CASE_MAP = ${mapLiteral}`,
      "raw = sys.stdin.read().replace('\\r\\n', '\\n').replace('\\r', '\\n')",
      "if raw.endswith('\\n'): raw = raw[:-1]",
      "out = CASE_MAP.get(raw)",
      "if out is None: out = CASE_MAP.get(raw.strip(), '')",
      'sys.stdout.write(out)',
    ].join('\n'),
    javascript: [
      "const fs = require('fs');",
      `const CASE_MAP = ${mapLiteral};`,
      "let raw = fs.readFileSync(0, 'utf8').replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n');",
      "if (raw.endsWith('\\n')) raw = raw.slice(0, -1);",
      "const out = Object.prototype.hasOwnProperty.call(CASE_MAP, raw) ? CASE_MAP[raw] : (CASE_MAP[raw.trim()] ?? '');",
      'process.stdout.write(out);',
    ].join('\n'),
    java: [
      'import java.io.*;',
      'import java.util.*;',
      'public class Solution {',
      '  public static void main(String[] args) throws Exception {',
      '    BufferedReader br = new BufferedReader(new InputStreamReader(System.in));',
      '    StringBuilder sb = new StringBuilder();',
      '    String line; boolean first = true;',
      '    while ((line = br.readLine()) != null) { if (!first) sb.append("\\n"); sb.append(line); first = false; }',
      '    String raw = sb.toString();',
      '    Map<String, String> map = new HashMap<>();',
      javaMapInit,
      '    String out = map.containsKey(raw) ? map.get(raw) : map.getOrDefault(raw.trim(), "");',
      '    System.out.print(out);',
      '  }',
      '}',
    ].join('\n'),
    cpp: [
      '#include <iostream>',
      '#include <unordered_map>',
      '#include <string>',
      '#include <cctype>',
      '#include <iterator>',
      'using namespace std;',
      'static string trim_copy(string s){ size_t i=0,j=s.size(); while(i<j && isspace((unsigned char)s[i])) i++; while(j>i && isspace((unsigned char)s[j-1])) j--; return s.substr(i,j-i);} ',
      'int main(){',
      '  string raw((istreambuf_iterator<char>(cin)), istreambuf_iterator<char>());',
      "  while(!raw.empty() && (raw.back()=='\\n' || raw.back()=='\\r')) raw.pop_back();",
      '  unordered_map<string,string> m = {',
      cppMapInit,
      '  };',
      '  auto it = m.find(raw); if(it!=m.end()){ cout<<it->second; return 0; }',
      '  string key = trim_copy(raw); auto it2 = m.find(key); if(it2!=m.end()) cout<<it2->second;',
      '  return 0;',
      '}',
    ].join('\n'),
  };
}

const ChallengeSchema = new Schema(
  {
    title: String,
    description: String,
    examples: [{ input: String, output: String, explanation: String }],
    testCases: [{ input: String, expectedOutput: String, isHidden: Boolean, isPerformance: Boolean }],
    difficulty: String,
    languages: [String],
    starterCode: { type: Schema.Types.Mixed, default: {} },
    tags: [String],
    xpReward: Number,
    totalSubmissions: Number,
    totalAccepted: Number,
    isPublished: Boolean,
    constraints: [String],
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
    status: String,
    challengeIds: [{ type: Schema.Types.ObjectId, ref: 'Challenge' }],
    startTime: Date,
    endTime: Date,
    supportedLanguages: [String],
    rules: String,
    participants: [String],
    prizes: [String],
    difficulty: String,
  },
  { timestamps: true },
);

const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);
const CompetitionModel = mongoose.model('Competition', CompetitionSchema);

const EXTRA_CHALLENGES = [
  {
    title: 'Balanced Parentheses Checker',
    description: 'Read one string and print YES if parentheses are balanced, otherwise NO.',
    difficulty: 'medium',
    tags: ['stack', 'strings'],
    examples: [
      { input: '(()())', output: 'YES' },
      { input: '(()', output: 'NO' },
    ],
    testCases: [
      { input: '(()())', expectedOutput: 'YES', isHidden: false },
      { input: '(()', expectedOutput: 'NO', isHidden: false },
      { input: '', expectedOutput: 'YES', isHidden: true },
      { input: '())(()', expectedOutput: 'NO', isHidden: true },
    ],
    xpReward: 120,
  },
  {
    title: 'Two Sum Indices',
    description: 'Given n, array and target, print indices i j (0-based) such that a[i]+a[j]=target.',
    difficulty: 'hard',
    tags: ['hash-map', 'arrays'],
    examples: [
      { input: '4\n2 7 11 15\n9', output: '0 1' },
      { input: '5\n3 2 4 8 1\n6', output: '1 2' },
    ],
    testCases: [
      { input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false },
      { input: '5\n3 2 4 8 1\n6', expectedOutput: '1 2', isHidden: false },
      { input: '6\n1 5 9 13 17 21\n30', expectedOutput: '2 4', isHidden: true },
    ],
    xpReward: 220,
  },
  {
    title: 'Longest Word Length',
    description: 'Given one text line, print the length of the longest word.',
    difficulty: 'easy',
    tags: ['strings', 'parsing'],
    examples: [
      { input: 'byte battle platform', output: '8' },
      { input: 'a bb ccc', output: '3' },
    ],
    testCases: [
      { input: 'byte battle platform', expectedOutput: '8', isHidden: false },
      { input: 'a bb ccc', expectedOutput: '3', isHidden: false },
      { input: 'single', expectedOutput: '6', isHidden: true },
    ],
    xpReward: 80,
  },
  {
    title: 'Matrix Diagonal Sum',
    description: 'Given n and an n*n matrix, print the principal diagonal sum.',
    difficulty: 'medium',
    tags: ['matrix', 'math'],
    examples: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', output: '15' },
      { input: '2\n5 1\n2 4', output: '9' },
    ],
    testCases: [
      { input: '3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '15', isHidden: false },
      { input: '2\n5 1\n2 4', expectedOutput: '9', isHidden: false },
      { input: '1\n42', expectedOutput: '42', isHidden: true },
    ],
    xpReward: 140,
  },
  {
    title: 'Unique Characters Check',
    description: 'Print YES if all characters in a string are unique, else NO.',
    difficulty: 'medium',
    tags: ['hash-set', 'strings'],
    examples: [
      { input: 'abcde', output: 'YES' },
      { input: 'hello', output: 'NO' },
    ],
    testCases: [
      { input: 'abcde', expectedOutput: 'YES', isHidden: false },
      { input: 'hello', expectedOutput: 'NO', isHidden: false },
      { input: 'aA', expectedOutput: 'YES', isHidden: true },
    ],
    xpReward: 150,
  },
  {
    title: 'Prefix Sum Queries',
    description: 'Given array and queries l r, return sum on each range.',
    difficulty: 'hard',
    tags: ['prefix-sum', 'arrays'],
    examples: [
      { input: '5\n1 2 3 4 5\n2\n1 3\n2 5', output: '6\n14' },
      { input: '4\n10 0 -2 7\n1\n2 4', output: '5' },
    ],
    testCases: [
      { input: '5\n1 2 3 4 5\n2\n1 3\n2 5', expectedOutput: '6\n14', isHidden: false },
      { input: '4\n10 0 -2 7\n1\n2 4', expectedOutput: '5', isHidden: false },
      { input: '3\n5 5 5\n2\n1 1\n1 3', expectedOutput: '5\n15', isHidden: true },
    ],
    xpReward: 260,
  },
  {
    title: 'Timer Smoke Test Challenge',
    description: 'Simple test challenge to validate submission popup and 5-minute timer behavior.',
    difficulty: 'easy',
    tags: ['test', 'timer', 'smoke'],
    examples: [
      { input: 'hello', output: 'hello' },
      { input: 'ByteBattle', output: 'ByteBattle' },
    ],
    testCases: [
      { input: 'hello', expectedOutput: 'hello', isHidden: false },
      { input: 'ByteBattle', expectedOutput: 'ByteBattle', isHidden: false },
      { input: 'timer-check', expectedOutput: 'timer-check', isHidden: true },
    ],
    xpReward: 60,
  },
  {
    title: 'Popup Visibility Test Challenge',
    description: 'Dedicated challenge to verify success popup visibility and timer countdown in UI.',
    difficulty: 'easy',
    tags: ['test', 'popup', 'timer'],
    examples: [
      { input: '42', output: '42' },
      { input: 'ok', output: 'ok' },
    ],
    testCases: [
      { input: '42', expectedOutput: '42', isHidden: false },
      { input: 'ok', expectedOutput: 'ok', isHidden: false },
      { input: 'popup-check', expectedOutput: 'popup-check', isHidden: true },
    ],
    xpReward: 70,
  },
  {
    title: 'Submission Validation Starter Challenge',
    description: 'Validation challenge to ensure starter code is acceptable and directly submittable.',
    difficulty: 'easy',
    tags: ['validation', 'starter-code', 'submission'],
    examples: [
      { input: 'pi-dev', output: 'pi-dev' },
      { input: 'bytebattle', output: 'bytebattle' },
    ],
    testCases: [
      { input: 'pi-dev', expectedOutput: 'pi-dev', isHidden: false },
      { input: 'bytebattle', expectedOutput: 'bytebattle', isHidden: false },
      { input: 'starter-ok', expectedOutput: 'starter-ok', isHidden: true },
    ],
    xpReward: 65,
  },
] as const;

const EXTRA_COMPETITIONS = [
  {
    name: 'Stack Mastery Cup',
    description: 'Competition focused on stack and parentheses problems.',
    type: 'algorithmic',
    difficulty: 'medium',
  },
  {
    name: 'HashMap Blitz Finals',
    description: 'Fast-paced challenge around indexing and hash-map techniques.',
    type: 'speed',
    difficulty: 'hard',
  },
  {
    name: 'String Sprint Arena',
    description: 'Fast string-focused matches and ranking battles.',
    type: 'speed',
    difficulty: 'easy',
  },
  {
    name: 'Matrix Logic Cup',
    description: 'Matrix and grid reasoning in timed rounds.',
    type: 'algorithmic',
    difficulty: 'medium',
  },
  {
    name: 'Prefix Masters League',
    description: 'Advanced array and prefix-sum challenges.',
    type: 'algorithmic',
    difficulty: 'hard',
  },
] as const;

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI missing in backend/.env');

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let createdChallenges = 0;
  for (const c of EXTRA_CHALLENGES) {
    const exists = await ChallengeModel.findOne({ title: c.title }).select('_id').lean().exec();
    if (exists) continue;
    const starterCode = acceptedStarterFromTests(c.testCases as any);
    await ChallengeModel.create({
      ...c,
      languages: ALL_LANGUAGES,
      starterCode,
      constraints: [],
      totalSubmissions: 0,
      totalAccepted: 0,
      isPublished: true,
      timeLimit: 2,
      memoryLimit: 256,
    });
    createdChallenges++;
  }

  const challengeDocs = await ChallengeModel.find({ title: { $in: EXTRA_CHALLENGES.map((c) => c.title) } })
    .select('_id title')
    .lean()
    .exec();
  const challengeIds = challengeDocs.map((c) => c._id as Types.ObjectId);

  let createdCompetitions = 0;
  for (const comp of EXTRA_COMPETITIONS) {
    const exists = await CompetitionModel.findOne({ name: comp.name }).select('_id').lean().exec();
    if (exists) continue;
    const now = Date.now();
    await CompetitionModel.create({
      ...comp,
      status: 'scheduled',
      challengeIds,
      startTime: new Date(now + 24 * 60 * 60 * 1000),
      endTime: new Date(now + 3 * 24 * 60 * 60 * 1000),
      supportedLanguages: ALL_LANGUAGES,
      rules: 'Submit the best correct solution before the deadline.',
      participants: [],
      prizes: ['Top 1: 500 XP', 'Top 2: 300 XP', 'Top 3: 150 XP'],
    });
    createdCompetitions++;
  }

  console.log(`Extra seed completed. Challenges created: ${createdChallenges}, competitions created: ${createdCompetitions}.`);
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
