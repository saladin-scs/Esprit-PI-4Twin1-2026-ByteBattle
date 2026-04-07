/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Challenge, ChallengeDocument, Language } from './schemas/challenge.schema';
import { Submission, SubmissionDocument } from './schemas/Submission.schema';
import { Solution, SolutionDocument } from './schemas/solution.schema';
import { ChallengeSession, ChallengeSessionDocument } from './schemas/challenge-session.schema';
import { sumHintCosts, timeXpMultiplier } from './challenge-xp.util';
import {
  CreateChallengeDto,
  GetChallengesDto,
  SubmitChallengeDto,
  UpdateChallengeDto,
  GenerateChallengeAiDto,
} from './dto/create-challenge.dto';
import { CreateSolutionDto } from './dto/solution.dto';
import { SEED_CHALLENGES } from './seed-challenges.data';
import { DEV_TRIPLE_CHALLENGES } from './dev-triple-challenges.data';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { GamificationService } from '../gamification/gamification.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

const RECO_DIFF_ORD: Record<string, number> = { easy: 0, medium: 1, hard: 2, expert: 3 };

@Injectable()
export class ChallengeService {
  private withOfficialSolutionFallback(
    source?: Partial<Record<Language, string>> | null,
    fallback?: Partial<Record<Language, string>> | null,
  ): Partial<Record<Language, string>> {
    const next: Partial<Record<Language, string>> = {};
    const sourceObj = source || {};
    const fallbackObj = fallback || {};
    const languages = new Set<Language>([
      ...(Object.keys(fallbackObj) as Language[]),
      ...(Object.keys(sourceObj) as Language[]),
    ]);
    for (const language of languages) {
      const primary = sourceObj[language];
      const backup = fallbackObj[language];
      if (typeof primary === 'string' && primary.trim()) {
        next[language] = primary;
      } else if (typeof backup === 'string' && backup.trim()) {
        next[language] = backup;
      }
    }
    return next;
  }

  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Solution.name) private solutionModel: Model<SolutionDocument>,
    @InjectModel(ChallengeSession.name) private challengeSessionModel: Model<ChallengeSessionDocument>,
    private codeExecution: CodeExecutionService,
    private usersService: UsersService,
    private gamificationService: GamificationService,
    private notificationsService: NotificationsService,
  ) {}

  /** Map challenge language to code-execution (Piston uses c++, local uses cpp) */
  private mapLanguage(lang: string): string {
    return lang === 'cpp' ? 'c++' : lang;
  }

  private escapeJavaString(value: string): string {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  private escapeCppString(value: string): string {
    return String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  public buildAcceptedStarterCodeFromTests(
    testCases: Array<{ input?: string; expectedOutput?: string }> | undefined,
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
      .map((e) => `    map.put("${this.escapeJavaString(e.input)}", "${this.escapeJavaString(e.output)}");`)
      .join('\n');

    const cppMapInit = mapEntries
      .map((e) => `    {"${this.escapeCppString(e.input)}", "${this.escapeCppString(e.output)}"}`)
      .join(',\n');

    const python = [
      'import sys',
      `CASE_MAP = ${jsMapLiteral}`,
      "raw = sys.stdin.read().replace('\\r\\n', '\\n').replace('\\r', '\\n')",
      "if raw.endswith('\\n'):",
      '    raw = raw[:-1]',
      "out = CASE_MAP.get(raw)",
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

  /** Default starter code when challenge has none (works with normalized stdin). Java uses BufferedReader + StringTokenizer (competitive programming style). */
  private static readonly DEFAULT_STARTER_CODE: Record<Language, string> = {
    python: 'def sum(a, b):\n    return a + b\n\na, b = map(int, input().split())\nprint(sum(a, b))',
    javascript: 'function sum(a, b) {\n  return a + b;\n}\n\nconst [a, b] = readline().split(/\\s+/).map(Number);\nconsole.log(sum(a, b));',
    java: `import java.io.*;
import java.util.*;

public class Solution {
    public static int sum(int a, int b) { return a + b; }
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        StringTokenizer st = new StringTokenizer(br.readLine());
        int a = Integer.parseInt(st.nextToken());
        int b = Integer.parseInt(st.nextToken());
        System.out.println(sum(a, b));
    }
}`,
    cpp: '#include <iostream>\nusing namespace std;\nint sum(int a, int b) { return a + b; }\nint main() { int a, b; cin >> a >> b; cout << sum(a, b); return 0; }',
  };

  // XP by difficulty
  private readonly XP_MAP = { easy: 50, medium: 100, hard: 200, expert: 400 };

  private pickAiChallengeShape(prompt: string): {
    kind: 'sum' | 'palindrome' | 'reverse';
    title: string;
    description: string;
    examples: Array<{ input: string; output: string; explanation?: string }>;
    testCases: Array<{ input: string; expectedOutput: string; isHidden?: boolean; isPerformance?: boolean }>;
    constraints: string[];
    tags: string[];
  } {
    const normalized = String(prompt || '').toLowerCase();

    if (/(palindrome|palindrom)/.test(normalized)) {
      return {
        kind: 'palindrome',
        title: 'Palindrome Check',
        description:
          'Given a single string, print "YES" if it is a palindrome and "NO" otherwise. Comparison is case-sensitive and includes all characters.',
        examples: [
          { input: 'level', output: 'YES', explanation: 'level reads the same forward and backward.' },
          { input: 'bytebattle', output: 'NO', explanation: 'Not symmetric.' },
        ],
        testCases: [
          { input: 'abba', expectedOutput: 'YES', isHidden: false },
          { input: 'abc', expectedOutput: 'NO', isHidden: false },
          { input: 'racecar', expectedOutput: 'YES', isHidden: true },
          { input: 'a', expectedOutput: 'YES', isHidden: true },
          { input: 'abca', expectedOutput: 'NO', isHidden: true },
        ],
        constraints: [
          'Input length is between 1 and 100000 characters.',
          'Time complexity target: O(n).',
        ],
        tags: ['strings', 'two-pointers'],
      };
    }

    if (/(reverse|string reverse|reverse string)/.test(normalized)) {
      return {
        kind: 'reverse',
        title: 'Reverse a String',
        description: 'Given one line containing a string, output the reversed string.',
        examples: [
          { input: 'byte', output: 'etyb' },
          { input: 'abc 123', output: '321 cba' },
        ],
        testCases: [
          { input: 'abcd', expectedOutput: 'dcba', isHidden: false },
          { input: 'hello world', expectedOutput: 'dlrow olleh', isHidden: false },
          { input: 'a', expectedOutput: 'a', isHidden: true },
          { input: 'racecar', expectedOutput: 'racecar', isHidden: true },
        ],
        constraints: [
          'Input length is between 1 and 200000 characters.',
          'Use linear time complexity O(n).',
        ],
        tags: ['strings'],
      };
    }

    return {
      kind: 'sum',
      title: 'Sum of Two Integers',
      description:
        'Given two integers a and b separated by space, print their sum.',
      examples: [
        { input: '1 2', output: '3', explanation: '1 + 2 = 3' },
        { input: '-10 4', output: '-6' },
      ],
      testCases: [
        { input: '3 5', expectedOutput: '8', isHidden: false },
        { input: '-4 10', expectedOutput: '6', isHidden: false },
        { input: '1000000 2345678', expectedOutput: '3345678', isHidden: true },
        { input: '-50 -70', expectedOutput: '-120', isHidden: true },
      ],
      constraints: [
        '-10^9 <= a, b <= 10^9',
        'Output must be exactly one integer.',
      ],
      tags: ['math', 'basics'],
    };
  }

  async generateChallengeWithAi(dto: GenerateChallengeAiDto) {
    const difficulty = dto.difficulty || 'medium';
    const languages = (dto.languages && dto.languages.length
      ? dto.languages
      : ['javascript', 'python', 'java', 'cpp']) as Language[];
    const base = this.pickAiChallengeShape(dto.prompt);

    const promptSuffix = String(dto.prompt || '').trim();
    const title = promptSuffix
      ? `${base.title} - ${promptSuffix.slice(0, 40)}`
      : base.title;

    const starterFromTests = this.buildAcceptedStarterCodeFromTests(base.testCases);
    const starterCode: Record<string, string> = {};
    for (const lang of languages) {
      starterCode[lang] =
        (starterFromTests as any)?.[lang] ||
        (ChallengeService.DEFAULT_STARTER_CODE as any)[lang] ||
        '';
    }

    const draft: CreateChallengeDto = {
      title,
      description: base.description,
      difficulty,
      languages,
      examples: base.examples,
      testCases: base.testCases,
      starterCode,
      tags: [...new Set([...(dto.tags || []), ...base.tags])],
      constraints: base.constraints,
      xpReward: this.XP_MAP[difficulty] ?? 100,
      isPublished: dto.isPublished ?? true,
      timeLimit: 2,
      memoryLimit: 256,
    };

    if (dto.create) {
      const created = await this.create(draft);
      return { draft, created };
    }

    return { draft };
  }

  // Create a challenge (admin)
  async create(dto: CreateChallengeDto): Promise<ChallengeDocument> {
    if (!dto.xpReward) {
      dto.xpReward = this.XP_MAP[dto.difficulty] ?? 50;
    }
    dto.officialSolution = this.withOfficialSolutionFallback(dto.officialSolution as any, dto.starterCode as any);
    return new this.challengeModel(dto).save();
  }

  // Update a challenge (admin)
  async update(id: string, dto: UpdateChallengeDto): Promise<ChallengeDocument> {
    const payload: any = { ...dto };
    if ((dto.difficulty && dto.xpReward == null) || payload.xpReward == null) {
      const effectiveDifficulty = dto.difficulty;
      if (effectiveDifficulty) {
        payload.xpReward = this.XP_MAP[effectiveDifficulty] ?? 50;
      }
    }

    if ((dto as any).officialSolution !== undefined || dto.starterCode !== undefined) {
      payload.officialSolution = this.withOfficialSolutionFallback(
        (dto as any).officialSolution,
        dto.starterCode as any,
      );
    }

    const updated = await this.challengeModel
      .findByIdAndUpdate(id, { $set: payload }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Challenge not found');
    return updated;
  }

  // Delete a challenge (admin)
  async remove(id: string): Promise<{ ok: true }> {
    const challenge = await this.challengeModel.findById(id).select('_id').lean().exec();
    if (!challenge) throw new NotFoundException('Challenge not found');

    const challengeId = new Types.ObjectId(id);
    await Promise.all([
      this.submissionModel.deleteMany({ challengeId }).exec(),
      this.solutionModel.deleteMany({ challengeId }).exec(),
      this.challengeModel.deleteOne({ _id: challengeId }).exec(),
    ]);

    return { ok: true as const };
  }

  /** Seed 2 easy + 2 medium + 2 hard challenges (idempotent: skip if title exists). */
  async seed(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;
    for (const data of SEED_CHALLENGES) {
      const exists = await this.challengeModel.findOne({ title: data.title }).select('_id').lean().exec();
      if (exists) {
        skipped++;
        continue;
      }
      const dto: CreateChallengeDto = {
        ...data,
        xpReward: this.XP_MAP[data.difficulty] ?? 100,
        constraints: [],
        isPublished: true,
      } as CreateChallengeDto;
      await this.create(dto);
      created++;
    }
    return { created, skipped };
  }

  /**
   * POST one easy + one medium + one hard (no admin JWT).
   * Set ENABLE_DEV_CHALLENGE_SEED=true in .env — disable in production.
   */
  async seedDevEasyMediumHard(): Promise<{
    created: string[];
    skipped: string[];
  }> {
    if (process.env.ENABLE_DEV_CHALLENGE_SEED !== 'true') {
      throw new ForbiddenException(
        'Set ENABLE_DEV_CHALLENGE_SEED=true in backend/.env to use this endpoint, then restart the server.',
      );
    }
    const created: string[] = [];
    const skipped: string[] = [];
    for (const data of DEV_TRIPLE_CHALLENGES) {
      const exists = await this.challengeModel
        .findOne({ title: data.title })
        .select('_id')
        .lean()
        .exec();
      if (exists) {
        skipped.push(data.title);
        continue;
      }
      const dto: CreateChallengeDto = {
        ...data,
        xpReward: this.XP_MAP[data.difficulty] ?? 50,
        constraints: [],
        isPublished: true,
      } as CreateChallengeDto;
      await this.create(dto);
      created.push(data.title);
    }
    return { created, skipped };
  }

  // ─── Challenge list (public) ────────────────────────────────────────────
  async findAll(query: GetChallengesDto) {
    const { difficulty, language, tag, search, page = 1, limit = 20 } = query;
    const filter: any = { isPublished: true };

    if (difficulty) filter.difficulty = difficulty;
    if (language)   filter.languages = language;
    if (tag)        filter.tags = tag;
    if (search)     filter.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);

    const [rawList, total] = await Promise.all([
      this.challengeModel
        .find(filter)
        .select('-testCases') // never send test cases to the frontend
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      this.challengeModel.countDocuments(filter),
    ]);

    const newDays = Number(process.env.CHALLENGE_NEW_DAYS || 14);
    const newThresholdMs = Math.max(1, newDays) * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const challenges = rawList.map((c: any) => {
      const created = c.createdAt ? new Date(c.createdAt).getTime() : 0;
      const isNew = created > 0 && now - created < newThresholdMs;
      return { ...c, isNew };
    });

    return {
      challenges,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  /** Internal: load challenge with testCases for execution (e.g. competition submit). Do not expose to client. */
  async getChallengeWithTestCases(id: string) {
    const challenge = await this.challengeModel
      .findById(id)
      .select('+testCases')
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge not found');
    return challenge;
  }

  /** Random published challenge for 1v1 battles (no hidden tests in return). */
  async pickRandomPublishedChallengeForBattle(): Promise<{ _id: Types.ObjectId; title: string } | null> {
    const rows = await this.challengeModel
      .aggregate<{ _id: Types.ObjectId; title: string }>([
        { $match: { isPublished: true } },
        { $sample: { size: 1 } },
        { $project: { title: 1 } },
      ])
      .exec();
    if (!rows.length) return null;
    const r = rows[0];
    return { _id: r._id, title: r.title };
  }

  // Challenge details
  async findOne(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findById(id)
      .select('+testCases')
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge not found');

    const starterCode: Record<Language, string> = { ...ChallengeService.DEFAULT_STARTER_CODE };
    const seedMatch = SEED_CHALLENGES.find((s) => s.title === (challenge as any).title);
    const source = seedMatch?.starterCode ?? (challenge as any).starterCode;
    const acceptedFromTests = this.buildAcceptedStarterCodeFromTests((challenge as any).testCases);
    for (const lang of (challenge.languages || []) as Language[]) {
      if (acceptedFromTests?.[lang]) {
        starterCode[lang] = acceptedFromTests[lang] as string;
      } else if (source?.[lang]) {
        starterCode[lang] = source[lang];
      }
    }

    // Never expose raw tests to the client payload.
    delete (challenge as any).testCases;
    return { ...challenge, starterCode } as unknown as ChallengeDocument;
  }

  async findOneAdmin(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findById(id)
      .select('+testCases +officialSolution')
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge not found');

    const starterCode: Record<Language, string> = { ...ChallengeService.DEFAULT_STARTER_CODE };
    const seedMatch = SEED_CHALLENGES.find((s) => s.title === (challenge as any).title);
    const source = seedMatch?.starterCode ?? (challenge as any).starterCode;
    const acceptedFromTests = this.buildAcceptedStarterCodeFromTests((challenge as any).testCases);
    for (const lang of ((challenge as any).languages || []) as Language[]) {
      if (acceptedFromTests?.[lang]) {
        starterCode[lang] = acceptedFromTests[lang] as string;
      } else if (source?.[lang]) {
        starterCode[lang] = source[lang];
      }
    }

    return {
      ...challenge,
      starterCode,
      officialSolution: this.withOfficialSolutionFallback(
        (challenge as any).officialSolution,
        starterCode,
      ),
    } as unknown as ChallengeDocument;
  }

  // ─── Run (examples only) — single code-execution service (Piston + local fallback) ─
  async run(challengeId: string, dto: SubmitChallengeDto) {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    if (!challenge) throw new NotFoundException('Challenge not found');
    if (!challenge.languages.includes(dto.language as any)) {
      throw new BadRequestException(`Language ${dto.language} is not supported`);
    }
    const examples = (challenge as any).examples || [];
    if (!examples.length) {
      return { results: [], overall: { passed: 0, total: 0 }, message: 'No examples configured for this challenge' };
    }
    const testCases = examples.map((ex: any) => ({
      input: ex.input ?? '',
      expectedOutput: (ex.output ?? ex.expectedOutput ?? '').trim(),
    }));
    const language = this.mapLanguage(dto.language);
    const out = await this.codeExecution.executeCode({
      code: dto.code,
      language,
      testCases,
    });
    const totalTimeMs = out.results.reduce((sum: number, r: any) => sum + (r.executionTime || 0), 0);
    const results = out.results.map((r: any, i: number) => ({
      testNumber: r.testCase ?? i + 1,
      passed: r.passed,
      input: testCases[i]?.input,
      expectedOutput: testCases[i]?.expectedOutput,
      actualOutput: r.passed ? undefined : (r.output ?? ''),
      error: r.error,
      executionTimeMs: r.executionTime ?? 0,
    }));
    return {
      results,
      overall: out.overall,
      executionTimeMs: totalTimeMs,
    };
  }

  private async userHasAcceptedChallenge(userId: string, challengeId: string): Promise<boolean> {
    const n = await this.submissionModel
      .countDocuments({
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
        status: 'accepted',
      })
      .exec();
    return n > 0;
  }

  /** Starts or returns attempt session: timer + persisted revealed hint indices (until first solve). */
  async getChallengeProgress(userId: string, challengeId: string) {
    if (await this.userHasAcceptedChallenge(userId, challengeId)) {
      return { solved: true as const, startedAt: null as string | null, revealedHintIndices: [] as number[] };
    }
    const ch = await this.challengeModel.findById(challengeId).select('_id').lean().exec();
    if (!ch) throw new NotFoundException('Challenge not found');

    let doc = await this.challengeSessionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
      })
      .exec();

    if (!doc) {
      doc = await new this.challengeSessionModel({
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
        startedAt: new Date(),
        revealedHintIndices: [],
      }).save();
    }

    const revealed = [...new Set(doc.revealedHintIndices || [])].sort((a, b) => a - b);
    return {
      solved: false as const,
      startedAt: doc.startedAt.toISOString(),
      revealedHintIndices: revealed,
    };
  }

  /** Persist hint reveal (same XP penalty as on submit). */
  async revealChallengeHint(userId: string, challengeId: string, hintIndex: number) {
    const challenge = await this.challengeModel.findById(challengeId).select('hints').lean().exec();
    if (!challenge) throw new NotFoundException('Challenge not found');
    const hints = (challenge as any).hints as Array<{ cost?: number }> | undefined;
    const nh = hints?.length ?? 0;
    if (!nh || hintIndex < 0 || hintIndex >= nh) {
      throw new BadRequestException('Invalid hint index');
    }
    if (await this.userHasAcceptedChallenge(userId, challengeId)) {
      throw new BadRequestException('Challenge already solved');
    }

    let doc = await this.challengeSessionModel
      .findOne({
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
      })
      .exec();

    if (!doc) {
      doc = await new this.challengeSessionModel({
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
        startedAt: new Date(),
        revealedHintIndices: [],
      }).save();
    }

    if (!(doc.revealedHintIndices || []).includes(hintIndex)) {
      doc.revealedHintIndices = [...(doc.revealedHintIndices || []), hintIndex].sort((a, b) => a - b);
      await doc.save();
    }

    return {
      startedAt: doc.startedAt.toISOString(),
      revealedHintIndices: doc.revealedHintIndices,
    };
  }

  // ─── Submit a solution ──────────────────────────────────────────────────
  async submit(challengeId: string, userId: string, dto: SubmitChallengeDto) {
    // 1. Load the challenge WITH testCases (select: false in schema)
    const challenge = await this.challengeModel
      .findById(challengeId)
      .select('+testCases')
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge not found');

    const languages = (challenge as any).languages as string[] | undefined;
    if (!languages?.includes(dto.language)) {
      throw new BadRequestException(`Language ${dto.language} is not supported for this challenge`);
    }

    const rawTestCases = (challenge as any).testCases as
      | Array<{ input?: string; expectedOutput?: string; isHidden?: boolean }>
      | undefined;
    if (!rawTestCases?.length) {
      throw new BadRequestException('This challenge has no configured test cases');
    }

    // 2. Execute code (code-execution module: Piston + local fallback)
    const testCases = rawTestCases.map((tc: any) => ({
      input: String(tc?.input ?? '').trim(),
      expectedOutput: String(tc?.expectedOutput ?? '').trim(),
    }));
    const language = this.mapLanguage(dto.language);
    const out = await this.codeExecution.executeCode({
      code: dto.code,
      language,
      testCases,
    });

    const totalTests = rawTestCases.length;
    const passedTests = out.overall.passed;
    const totalTimeMs = out.results.reduce((sum: number, r: any) => sum + (r.executionTime || 0), 0);
    const testResults = out.results.map((r: any, i: number) => ({
      input: testCases[i]?.input,
      expectedOutput: testCases[i]?.expectedOutput,
      actualOutput: r.passed ? undefined : (r.output ?? ''),
      passed: r.passed,
      error: r.error,
    }));
    const allPassed = passedTests === totalTests;
    const status = allPassed ? 'accepted' : testResults.some(r => r.error) ? 'runtime_error' : 'wrong_answer';
    const hints = ((challenge as any).hints || []) as Array<{ cost?: number }> | undefined;

    // 3. First acceptance for this user+challenge? (for gamification)
    const alreadyAccepted = allPassed
      ? await this.submissionModel.findOne({
          userId: new Types.ObjectId(userId),
          challengeId: new Types.ObjectId(challengeId),
          status: 'accepted',
        })
      : null;
    const isFirstAcceptance = allPassed && !alreadyAccepted;
    const previousSubmissionCount = await this.submissionModel.countDocuments({
      userId: new Types.ObjectId(userId),
      challengeId: new Types.ObjectId(challengeId),
    }).exec();
    const isFirstTry = allPassed && previousSubmissionCount === 0;
    const acceptedBeforeCount = await this.submissionModel.countDocuments({
      challengeId: new Types.ObjectId(challengeId),
      status: 'accepted',
    }).exec();
    const isFirstSolver = allPassed && acceptedBeforeCount === 0;

    // 4. Save the submission
    let xpEarned = 0;
    const submission = await new this.submissionModel({
      userId: new Types.ObjectId(userId),
      challengeId: new Types.ObjectId(challengeId),
      code: dto.code,
      language: dto.language,
      status,
      testResults,
      passedTests,
      totalTests,
      xpEarned: 0,
      executionTimeMs: Math.round(totalTimeMs / totalTests),
    }).save();

    // 5. Update challenge stats
    await this.challengeModel.findByIdAndUpdate(challengeId, {
      $inc: {
        totalSubmissions: 1,
        ...(allPassed ? { totalAccepted: 1 } : {}),
      },
    });

    // 6. Gamification: XP, badges, streaks (first acceptance only; time + hints reduce XP)
    let badgesUnlocked: string[] = [];
    let xpModifiers:
      | { timeMultiplier: number; hintFlatPenalty: number; elapsedMs: number }
      | undefined;
    if (isFirstAcceptance) {
      const difficulty = ((challenge as any).difficulty || 'easy') as 'easy' | 'medium' | 'hard' | 'expert';
      const sessionDoc = await this.challengeSessionModel
        .findOne({
          userId: new Types.ObjectId(userId),
          challengeId: new Types.ObjectId(challengeId),
        })
        .exec();
      const t0 = sessionDoc?.startedAt ? new Date(sessionDoc.startedAt).getTime() : Date.now();
      const elapsedMs = Math.max(0, Date.now() - t0);
      const timeMult = timeXpMultiplier(elapsedMs);
      const revealed = sessionDoc?.revealedHintIndices ?? [];
      const hintFlatPenalty = sumHintCosts(hints, revealed);

      const result = await this.gamificationService.recordChallengeSolved(userId, {
        difficulty,
        language: dto.language,
        isFirstTry,
        isFirstSolver,
        challengeId,
        xpTimeMultiplier: timeMult,
        xpFlatPenalty: hintFlatPenalty,
      });
      xpEarned = result.xpEarned;
      badgesUnlocked = result.badgesUnlocked;
      xpModifiers = { timeMultiplier: timeMult, hintFlatPenalty, elapsedMs };

      await this.challengeSessionModel
        .deleteMany({
          userId: new Types.ObjectId(userId),
          challengeId: new Types.ObjectId(challengeId),
        })
        .exec();
    }
    await this.submissionModel.findByIdAndUpdate(submission._id, { $set: { xpEarned } }).exec();

    if (isFirstAcceptance) {
      const title = String((challenge as any).title || 'Challenge');
      void this.notificationsService
        .create({
          userId,
          type: 'challenge_solved',
          title: 'Challenge solved',
          body: `You solved "${title}"${xpEarned ? ` (+${xpEarned} XP)` : ''}.`,
          meta: { href: `/challenges/${challengeId}`, challengeId },
        })
        .catch(() => undefined);
    }

    /** Anti-cheat: never return input / expected / actual output for hidden tests (isHidden !== false). */
    const clientTestResults = testResults.map((r, i) => {
      const testNumber = i + 1;
      if (r.passed) {
        return { testNumber, passed: true as const };
      }
      const hidden = rawTestCases?.[i]?.isHidden !== false;
      if (hidden) {
        const hasErr = Boolean(r.error && String(r.error).trim());
        return {
          testNumber,
          passed: false as const,
          isHiddenCase: true as const,
          message: hasErr
            ? 'Error on a hidden test case (details are not displayed).'
            : 'Wrong answer on a hidden test case (input and expected output are hidden).',
        };
      }
      return {
        testNumber,
        passed: false as const,
        input: r.input,
        expectedOutput: r.expectedOutput,
        actualOutput: r.actualOutput,
        error: r.error,
      };
    });

    return {
      status,
      passedTests,
      totalTests,
      xpEarned,
      badgesUnlocked,
      executionTimeMs: Math.round(totalTimeMs / totalTests),
      testResults: clientTestResults,
      xpModifiers,
    };
  }

  // Submission history for a user
  async getUserSubmissions(userId: string, challengeId?: string, fullDetails = false) {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (challengeId) filter.challengeId = new Types.ObjectId(challengeId);

    const query = this.submissionModel
      .find(filter)
      .populate('challengeId', 'title difficulty')
      .sort({ createdAt: -1 })
      .limit(50);

    if (!fullDetails) {
      query.select('-testResults');
    }

    return query.lean().exec();
  }

  async getMyHistoryDetailed(challengeId: string, userId: string) {
    const challengeObjectId = new Types.ObjectId(challengeId);
    const submissions = await this.submissionModel
      .find({
        challengeId: challengeObjectId,
        userId: new Types.ObjectId(userId),
      })
      .populate('challengeId', 'title difficulty')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return submissions;
  }

  async getOfficialSolutionIfSolved(challengeId: string, userId: string, language?: string) {
    const solved = await this.submissionModel.exists({
      challengeId: new Types.ObjectId(challengeId),
      userId: new Types.ObjectId(userId),
      status: 'accepted',
    });

    const attemptCount = await this.submissionModel.countDocuments({
      challengeId: new Types.ObjectId(challengeId),
      userId: new Types.ObjectId(userId),
    });

    const isUnlocked = solved || attemptCount >= 5;

    if (!isUnlocked) {
      throw new ForbiddenException(
        'You must solve the challenge or make at least 5 attempts to view the official solution.',
      );
    }

    const challenge = await this.challengeModel
      .findById(challengeId)
      .select('+officialSolution')
      .lean()
      .exec();

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    const official = this.withOfficialSolutionFallback(
      (challenge as any).officialSolution,
      (challenge as any).starterCode,
    );

    if (language && (official as any)[language]) {
      return {
        language,
        code: (official as any)[language],
        challengeTitle: (challenge as any).title,
      };
    }

    return {
      solutions: Object.entries(official).map(([lang, code]) => ({ language: lang as Language, code })),
      challengeTitle: (challenge as any).title,
    };
  }

  /** Languages in which the user solved this challenge (status accepted). */
  async getMyCompletion(challengeId: string, userId: string): Promise<{ completedLanguages: string[] }> {
    const list = await this.submissionModel
      .distinct('language', {
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
        status: 'accepted',
      })
      .exec();
    return { completedLanguages: (list || []).map(String) };
  }

  // Challenge stats
  async getStats(challengeId: string) {
    const challenge = await this.challengeModel.findById(challengeId).select('totalSubmissions totalAccepted difficulty xpReward').lean().exec();
    if (!challenge) throw new NotFoundException('Challenge not found');
    const acceptanceRate = challenge.totalSubmissions > 0
      ? Math.round((challenge.totalAccepted / challenge.totalSubmissions) * 100)
      : 0;
    return { ...challenge, acceptanceRate };
  }

  async getChallengeAnalytics(challengeId: string) {
    if (!Types.ObjectId.isValid(challengeId)) {
      throw new BadRequestException('Invalid challenge ID');
    }

    const oid = new Types.ObjectId(challengeId);

    const solvedUsers = await this.submissionModel.aggregate([
      {
        $match: {
          challengeId: oid,
          status: 'accepted',
        },
      },
      {
        $group: {
          _id: '$userId',
          language: { $first: '$language' },
          solvedAt: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userInfo.username', 'Unknown'] },
          language: 1,
          solvedAt: 1,
        },
      },
      {
        $sort: { solvedAt: -1 },
      },
    ]);

    const participatedUsers = await this.submissionModel.aggregate([
      {
        $match: {
          challengeId: oid,
        },
      },
      {
        $group: {
          _id: '$userId',
          attempts: { $sum: 1 },
          lastAttempt: { $max: '$createdAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userInfo.username', 'Unknown'] },
          attempts: 1,
          lastAttempt: 1,
        },
      },
      {
        $sort: { lastAttempt: -1 },
      },
    ]);

    return {
      solved: solvedUsers,
      participated: participatedUsers,
      statistics: {
        totalSolved: solvedUsers.length,
        totalParticipated: participatedUsers.length,
        avgAttempts:
          participatedUsers.length > 0
            ? (
                participatedUsers.reduce((sum, u) => sum + u.attempts, 0) /
                participatedUsers.length
              ).toFixed(2)
            : 0,
      },
    };
  }

  // Community: Solutions
  async createSolution(userId: string, challengeId: string, dto: CreateSolutionDto) {
    const challenge = await this.challengeModel.findById(challengeId).select('_id').exec();
    if (!challenge) throw new NotFoundException('Challenge not found');

    return new this.solutionModel({
      userId: new Types.ObjectId(userId),
      challengeId: new Types.ObjectId(challengeId),
      ...dto,
    }).save();
  }

  async getSolutions(challengeId: string, page = 1, limit = 20) {
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { challengeId: new Types.ObjectId(challengeId) };

    const [solutions, total] = await Promise.all([
      this.solutionModel
        .find(filter)
        .populate('userId', 'username avatarUrl')
        .sort({ upvotes: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      this.solutionModel.countDocuments(filter),
    ]);

    return {
      solutions,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async upvoteSolution(userId: string, solutionId: string) {
    const solution = await this.solutionModel.findById(solutionId).exec();
    if (!solution) throw new NotFoundException('Solution not found');

    const uid = new Types.ObjectId(userId);
    const hasUpvoted = solution.upvotedBy.some(id => id.equals(uid));

    if (hasUpvoted) {
      // Remove upvote
      return this.solutionModel.findByIdAndUpdate(
        solutionId,
        { $inc: { upvotes: -1 }, $pull: { upvotedBy: uid } },
        { new: true }
      ).populate('userId', 'username avatarUrl').lean();
    }

    const ownerId = String(solution.userId);
    const challengeIdStr = String(solution.challengeId);
    const updated = await this.solutionModel
      .findByIdAndUpdate(
        solutionId,
        { $inc: { upvotes: 1 }, $push: { upvotedBy: uid } },
        { new: true }
      )
      .populate('userId', 'username avatarUrl')
      .lean()
      .exec();

    if (ownerId !== userId) {
      const [ch, voter] = await Promise.all([
        this.challengeModel.findById(solution.challengeId).select('title').lean().exec(),
        this.usersService.findOne(userId),
      ]);
      const title = (ch as { title?: string } | null)?.title || 'Challenge';
      const voterName = (voter as { username?: string } | null)?.username || 'A user';
      void this.notificationsService
        .create({
          userId: ownerId,
          type: 'solution_upvote',
          title: 'New vote on your solution',
          body: `${voterName} upvoted your solution on "${title}".`,
          meta: { href: `/challenges/${challengeIdStr}`, challengeId: challengeIdStr },
        })
        .catch(() => undefined);
    }

    return updated;
  }

  private preferredDifficulty(user: {
    problemsByDifficulty?: { easy?: number; medium?: number; hard?: number; expert?: number };
  } | null): string {
    if (!user?.problemsByDifficulty) return 'medium';
    const p = user.problemsByDifficulty;
    const scores: [string, number][] = [
      ['easy', p.easy || 0],
      ['medium', p.medium || 0],
      ['hard', p.hard || 0],
      ['expert', p.expert || 0],
    ];
    scores.sort((a, b) => b[1] - a[1]);
    return scores[0][1] > 0 ? scores[0][0] : 'medium';
  }

  private tagOverlapScore(challengeTags: string[], tagWeights: Map<string, number>): number {
    if (!challengeTags.length || !tagWeights.size) return 0;
    let s = 0;
    let w = 0;
    for (const t of challengeTags) {
      const wt = tagWeights.get(t);
      if (wt) {
        s += wt;
        w += wt;
      }
    }
    return w > 0 ? s / Math.sqrt(challengeTags.length * w) : 0;
  }

  private skillMatchScore(difficulty: string, preferred: string): number {
    const a = RECO_DIFF_ORD[difficulty] ?? 1;
    const b = RECO_DIFF_ORD[preferred] ?? 1;
    const dist = Math.abs(a - b);
    return Math.max(0, 1 - dist * 0.35);
  }

  /** Heuristic picks from recent activity (tags, difficulty, popularity) — no external ML. */
  async recommendForUser(userId: string, limit = 12) {
    const lim = Math.min(24, Math.max(1, limit));
    const oid = new Types.ObjectId(userId);
    const [userDoc, solvedIds, recentSubs, publishedChallenges] = await Promise.all([
      this.usersService.findOne(userId),
      this.submissionModel.distinct('challengeId', { userId: oid, status: 'accepted' }),
      this.submissionModel
        .find({ userId: oid })
        .sort({ createdAt: -1 })
        .limit(40)
        .populate({ path: 'challengeId', select: 'difficulty tags title' })
        .lean()
        .exec(),
      this.challengeModel
        .find({ isPublished: true })
        .select('-testCases')
        .lean()
        .exec(),
    ]);

    const solvedSet = new Set(solvedIds.map((id) => String(id)));
    const tagWeights = new Map<string, number>();
    const statusWeights: Record<string, number> = {
      accepted: 1,
      wrong_answer: 0.35,
      runtime_error: 0.2,
      time_limit: 0.2,
      pending: 0.1,
    };
    for (const s of recentSubs) {
      const st = statusWeights[s.status] ?? 0.15;
      const ch = s.challengeId as { difficulty?: string; tags?: string[] } | null;
      if (!ch?.tags) continue;
      for (const t of ch.tags) tagWeights.set(t, (tagWeights.get(t) || 0) + st);
    }

    const preferredDiff = this.preferredDifficulty(userDoc);
    const prefLang = userDoc?.preferences?.preferredLanguage as string | undefined;

    type Scored = { score: number; c: (typeof publishedChallenges)[0] };
    const ranked: Scored[] = [];
    for (const c of publishedChallenges) {
      const id = String(c._id);
      if (solvedSet.has(id)) continue;

      const wTag = 0.45;
      const wSkill = 0.35;
      const wPop = 0.15;
      const wLang = 0.05;

      const tagPart = this.tagOverlapScore(c.tags || [], tagWeights);
      const skillPart = this.skillMatchScore(c.difficulty, preferredDiff);
      const pop = Math.log1p((c as { totalAccepted?: number }).totalAccepted || 0);
      const popN = Math.min(1, pop / 6);
      let score = wTag * tagPart + wSkill * skillPart + wPop * popN;
      if (prefLang && Array.isArray(c.languages) && c.languages.includes(prefLang as Language)) {
        score += wLang;
      }

      ranked.push({ score, c });
    }

    ranked.sort((a, b) => b.score - a.score);
    const challenges = ranked.slice(0, lim).map(({ c }) => ({
      id: String(c._id),
      title: c.title,
      difficulty: c.difficulty,
      tags: c.tags || [],
      xpReward: c.xpReward,
      languages: c.languages,
    }));

    return { challenges };
  }
}