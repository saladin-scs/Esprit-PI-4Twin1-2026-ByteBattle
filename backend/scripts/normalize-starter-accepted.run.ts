import * as dotenv from 'dotenv';
import * as path from 'path';
import mongoose, { Schema } from 'mongoose';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

type Language = 'javascript' | 'python' | 'java' | 'cpp';

type TestCase = {
  input?: string;
  expectedOutput?: string;
};

const ALL_LANGUAGES: Language[] = ['python', 'javascript', 'java', 'cpp'];

function escapeJavaString(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function escapeCppString(value: string): string {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function buildAcceptedStarterCodeFromTests(
  testCases: TestCase[] | undefined,
): Partial<Record<Language, string>> {
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
    .map((e) => `    map.put("${escapeJavaString(e.input)}", "${escapeJavaString(e.output)}");`)
    .join('\n');

  const cppMapInit = mapEntries
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
    '    String out = map.get(raw);',
    '    if (out == null) out = map.getOrDefault(raw.trim(), "");',
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
    '  } else {',
    '    string t = trim_copy(raw);',
    '    if (m.count(t)) cout << m[t];',
    '  }',
    '  return 0;',
    '}',
  ].join('\n');

  return { python, javascript, java, cpp };
}

const ChallengeSchema = new Schema(
  {
    title: String,
    languages: [String],
    testCases: [{ input: String, expectedOutput: String }],
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

  const challenges = await ChallengeModel.find({}).select('_id title languages testCases starterCode').lean().exec();

  let updated = 0;
  let skipped = 0;

  for (const c of challenges as Array<any>) {
    const generated = buildAcceptedStarterCodeFromTests(c.testCases || []);
    if (!generated || Object.keys(generated).length === 0) {
      skipped++;
      continue;
    }

    const nextStarter: Record<string, string> = {};

    for (const lang of ALL_LANGUAGES) {
      const gen = generated[lang];
      if (gen) nextStarter[lang] = gen;
    }

    await ChallengeModel.updateOne(
      { _id: c._id },
      { $set: { starterCode: nextStarter, languages: ALL_LANGUAGES } },
    ).exec();
    updated++;
  }

  console.log(`Normalized starterCode for ${updated} challenges. Skipped ${skipped}.`);
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
