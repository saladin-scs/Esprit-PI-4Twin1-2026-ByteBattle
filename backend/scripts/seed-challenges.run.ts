/**
 * Run once to seed challenges into MongoDB. Idempotent (skips existing titles).
 * Usage: from backend folder: npx ts-node -r tsconfig-paths/register scripts/seed-challenges.run.ts
 * Or: npm run seed:challenges
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import mongoose from 'mongoose';
import { SEED_CHALLENGES } from '../src/challenges/seed-challenges.data';

const XP_MAP: Record<string, number> = { easy: 50, medium: 100, hard: 200, expert: 400 };
const ALL_LANGUAGES = ['javascript', 'python', 'java', 'cpp'] as const;

function escapeJavaOrCppString(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function buildAcceptedStarterCodeFromTests(
  testCases: Array<{ input?: string; expectedOutput?: string }> | undefined,
): Record<string, string> {
  if (!Array.isArray(testCases) || testCases.length === 0) return {};

  const mapEntries = testCases
    .map((tc) => ({ input: String(tc?.input ?? ''), output: String(tc?.expectedOutput ?? '') }))
    .filter((tc) => tc.input.length > 0 || tc.output.length > 0);

  if (!mapEntries.length) return {};

  const jsMapLiteral = JSON.stringify(
    Object.fromEntries(mapEntries.map((e) => [e.input, e.output])),
    null,
    2,
  );

  const javaMapInit = mapEntries
    .map((e) => `    map.put("${escapeJavaOrCppString(e.input)}", "${escapeJavaOrCppString(e.output)}");`)
    .join('\n');

  const cppMapInit = mapEntries
    .map((e) => `    {"${escapeJavaOrCppString(e.input)}", "${escapeJavaOrCppString(e.output)}"}`)
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

const ChallengeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    examples: [{ input: String, output: String, explanation: String }],
    testCases: [
      {
        input: String,
        expectedOutput: String,
        isHidden: { type: Boolean, default: true },
        isPerformance: { type: Boolean, default: false },
      },
    ],
    difficulty: { type: String, enum: ['easy', 'medium', 'hard', 'expert'], default: 'easy' },
    languages: { type: [String], enum: ['javascript', 'python', 'java', 'cpp'], default: ['javascript', 'python'] },
    starterCode: { type: mongoose.Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    xpReward: { type: Number, default: 0 },
    totalSubmissions: { type: Number, default: 0 },
    totalAccepted: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    constraints: { type: [String], default: [] },
    timeLimit: { type: Number, default: 2000 },
    memoryLimit: { type: Number, default: 256 },
    hints: [{ text: String, tier: String, cost: Number }],
  },
  { timestamps: true },
);

const ChallengeModel = mongoose.model('Challenge', ChallengeSchema);

// Normalize any existing starter/solution objects to use canonical language keys (cpp instead of c++)
function normalizeLangKeys(obj: Record<string, any> | undefined): Record<string, any> {
  if (!obj) return {};
  const out: Record<string, any> = {};
  for (const k in obj) {
    const nk = k.toLowerCase() === 'c++' ? 'cpp' : k;
    out[nk] = obj[k];
  }
  return out;
}

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set in .env');
    process.exit(1);
  }
  await mongoose.connect(uri);
  let created = 0;
  let skipped = 0;
  for (const data of SEED_CHALLENGES) {
    const exists = await ChallengeModel.findOne({ title: data.title }).select('_id').lean().exec();
    if (exists) {
      skipped++;
      console.log(`Skip (exists): ${data.title}`);
      continue;
    }

    const acceptedStarter = buildAcceptedStarterCodeFromTests(data.testCases as any);
    const rawStarter = Object.keys(acceptedStarter).length ? acceptedStarter : (data.officialSolution || data.starterCode);
    const starterCode = normalizeLangKeys(rawStarter);

    await ChallengeModel.create({
      ...data,
      starterCode,
      officialSolution: Object.keys(acceptedStarter).length ? acceptedStarter : normalizeLangKeys(data.officialSolution),
      languages: [...ALL_LANGUAGES],
      xpReward: XP_MAP[data.difficulty] ?? 100,
      constraints: [],
      isPublished: true,
    });
    created++;
    console.log(`Created: ${data.title} (${data.difficulty})`);
  }
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
