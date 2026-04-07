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
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto, UpdateChallengeDto } from './dto/create-challenge.dto';
import { CreateSolutionDto } from './dto/solution.dto';
import { SEED_CHALLENGES } from './seed-challenges.data';
import { DEV_TRIPLE_CHALLENGES } from './dev-triple-challenges.data';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { GamificationService } from '../gamification/gamification.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

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
    private codeExecution: CodeExecutionService,
    private usersService: UsersService,
    private gamificationService: GamificationService,
    private notificationsService: NotificationsService,
  ) {}

  /** Map challenge language to code-execution (Piston uses c++, local uses cpp) */
  private mapLanguage(lang: string): string {
    return lang === 'cpp' ? 'c++' : lang;
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

  // Create a challenge (admin)
  async create(dto: CreateChallengeDto): Promise<ChallengeDocument> {
    if (!dto.xpReward) {
      dto.xpReward = this.XP_MAP[dto.difficulty] ?? 50;
    }
    dto.officialSolution = this.withOfficialSolutionFallback(dto.officialSolution, dto.starterCode);
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

    if (dto.officialSolution !== undefined || dto.starterCode !== undefined) {
      payload.officialSolution = this.withOfficialSolutionFallback(
        dto.officialSolution,
        dto.starterCode,
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

  // Challenge details
  async findOne(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findById(id)
      .select('-testCases') // never expose tests
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge not found');
    const starterCode: Record<Language, string> = { ...ChallengeService.DEFAULT_STARTER_CODE };
    const seedMatch = SEED_CHALLENGES.find((s) => s.title === (challenge as any).title);
    const source = seedMatch?.starterCode ?? (challenge as any).starterCode;
    for (const lang of (challenge.languages || []) as Language[]) {
      if (source?.[lang]) {
        starterCode[lang] = source[lang];
      }
    }
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
    const starterSource = seedMatch?.starterCode ?? (challenge as any).starterCode;
    for (const lang of ((challenge as any).languages || []) as Language[]) {
      if (starterSource?.[lang]) {
        starterCode[lang] = starterSource[lang];
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
  async run(challengeId: string, dto: SubmitChallengeDto, userId: string) {
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
      actualOutput: r.output ?? '', // always show output for Runs if present
      error: r.error,
      executionTimeMs: r.executionTime ?? 0,
    }));

    /** The user requested that every "Run" or "Test" also be submitted/saved in history. */
    await new this.submissionModel({
      userId: new Types.ObjectId(userId),
      challengeId: new Types.ObjectId(challengeId),
      code: dto.code,
      language: dto.language,
      status: out.overall.passed === out.overall.total ? 'accepted' : 'wrong_answer',
      testResults: results,
      passedTests: out.overall.passed,
      totalTests: out.overall.total,
      xpEarned: 0,
      executionTimeMs: Math.round(totalTimeMs / (out.overall.total || 1)),
    }).save();

    return {
      results,
      overall: out.overall,
      executionTimeMs: totalTimeMs,
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

    let passedTests = 0;
    let totalTests = rawTestCases.length;
    let totalTimeMs = 0;
    let testResults: any[] = [];
    let status = 'runtime_error'; // Default if it crashes early

    try {
      const out = await this.codeExecution.executeCode({
        code: dto.code,
        language,
        testCases,
      });

      passedTests = out.overall.passed;
      totalTimeMs = out.results.reduce((sum: number, r: any) => sum + (r.executionTime || 0), 0);
      testResults = out.results.map((r: any, i: number) => ({
        input: testCases[i]?.input,
        expectedOutput: testCases[i]?.expectedOutput,
        actualOutput: r.output ?? '',
        passed: r.passed,
        error: r.error,
      }));
      const allPassed = passedTests === totalTests;
      status = allPassed ? 'accepted' : testResults.some(r => r.error) ? 'runtime_error' : 'wrong_answer';
    } catch (err: any) {
      // Still save the record even if execution/compilation fails
      status = 'runtime_error';
      testResults = [{ error: err?.message || 'Execution error' }];
    }

    // 3. First acceptance for this user+challenge?
    const challengeObjectId = new Types.ObjectId(challengeId);
    const userObjectId = new Types.ObjectId(userId);

    const [alreadyAccepted, totalAttempts, totalAcceptedForChallenge] = await Promise.all([
      this.submissionModel.findOne({
        userId: userObjectId,
        challengeId: challengeObjectId,
        status: 'accepted',
      }).lean().exec(),
      this.submissionModel.countDocuments({
        userId: userObjectId,
        challengeId: challengeObjectId,
      }),
      this.submissionModel.countDocuments({
        challengeId: challengeObjectId,
        status: 'accepted',
      }),
    ]);

    const allPassed = status === 'accepted';
    const isFirstAcceptance = allPassed && !alreadyAccepted;
    const isFirstTry = allPassed && totalAttempts === 0;
    const isFirstSolver = allPassed && totalAcceptedForChallenge === 0;

    // 4. Save the submission ALWAYS
    let xpEarned = 0;
    const submission = await new this.submissionModel({
      userId: userObjectId,
      challengeId: challengeObjectId,
      code: dto.code,
      language: dto.language,
      status,
      testResults,
      passedTests,
      totalTests,
      xpEarned: 0,
      executionTimeMs: Math.round(totalTimeMs / (totalTests || 1)),
    }).save();

    // 5. Update challenge stats
    await this.challengeModel.findByIdAndUpdate(challengeId, {
      $inc: {
        totalSubmissions: 1,
        ...(allPassed ? { totalAccepted: 1 } : {}),
      },
    });

    // 6. Gamification: XP, badges, streaks (first acceptance only)
    let badgesUnlocked: string[] = [];
    if (isFirstAcceptance) {
      const difficulty = ((challenge as any).difficulty || 'easy') as 'easy' | 'medium' | 'hard' | 'expert';
      const result = await this.gamificationService.recordChallengeSolved(userId, {
        difficulty,
        language: dto.language,
        isFirstTry,
        isFirstSolver,
        challengeId,
      });
      xpEarned = result.xpEarned;
      badgesUnlocked = result.badgesUnlocked;
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
    };
  }

  // Submission history for a user (with optional full details)
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

  // Detailed history for specific challenge (full test results)
  async getMyHistoryDetailed(challengeId: string, userId: string) {
    const challengeObjectId = new Types.ObjectId(challengeId);
    const submissions = await this.submissionModel
      .find({
        challengeId: challengeObjectId,
        userId: new Types.ObjectId(userId)
      })
      .populate('challengeId', 'title difficulty')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return submissions;
  }

  // Get official solution if user has solved the challenge (has accepted submission)
  async getOfficialSolutionIfSolved(challengeId: string, userId: string, language?: string) {
    // Check if user has accepted submission or has made 5+ attempts
    const solved = await this.submissionModel.exists({
      challengeId: new Types.ObjectId(challengeId),
      userId: new Types.ObjectId(userId),
      status: 'accepted'
    });

    const attemptCount = await this.submissionModel.countDocuments({
      challengeId: new Types.ObjectId(challengeId),
      userId: new Types.ObjectId(userId),
    });

    const isUnlocked = solved || attemptCount >= 5;

    if (!isUnlocked) {
      throw new ForbiddenException(
        `You must solve the challenge or make at least 5 attempts to view the official solution.`
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

    const official = challenge.officialSolution || {};
    
    if (language && official[language]) {
      return {
        language,
        code: official[language],
        challengeTitle: challenge.title
      };
    }

    // Return all languages if no specific language requested
    return {
      solutions: Object.entries(official).map(([lang, code]) => ({ language: lang as Language, code })),
      challengeTitle: challenge.title
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

  /** Simple recommendations: unsolved challenges, weighted by recent accepted tags/difficulty. */
  async recommendForUser(userId: string, limit = 12) {
    const lim = Math.min(24, Math.max(1, limit));
    const oid = new Types.ObjectId(userId);
    const solved = await this.submissionModel.distinct('challengeId', { userId: oid, status: 'accepted' });
    const solvedSet = new Set(solved.map((id) => String(id)));
    const nin = [...solvedSet].filter((id) => Types.ObjectId.isValid(id)).map((id) => new Types.ObjectId(id));

    const baseFilter: Record<string, unknown> = { isPublished: true };
    if (nin.length) baseFilter._id = { $nin: nin };

    const recentSubs = await this.submissionModel
      .find({ userId: oid, status: 'accepted' })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate({ path: 'challengeId', select: 'difficulty tags' })
      .lean()
      .exec();

    const tagWeights = new Map<string, number>();
    const diffWeights = new Map<string, number>();
    for (const s of recentSubs) {
      const ch = s.challengeId as { difficulty?: string; tags?: string[] } | null;
      if (!ch) continue;
      if (ch.difficulty) diffWeights.set(ch.difficulty, (diffWeights.get(ch.difficulty) || 0) + 1);
      for (const t of ch.tags || []) tagWeights.set(t, (tagWeights.get(t) || 0) + 1);
    }
    const topTags = [...tagWeights.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t).slice(0, 6);
    let preferredDiffs = [...diffWeights.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
    if (!preferredDiffs.length) preferredDiffs = ['easy', 'medium', 'hard', 'expert'];

    let list: any[] = [];
    if (topTags.length) {
      list = await this.challengeModel
        .find({
          ...baseFilter,
          tags: { $in: topTags },
          difficulty: { $in: preferredDiffs },
        })
        .select('-testCases')
        .sort({ createdAt: -1 })
        .limit(lim)
        .lean()
        .exec();
    }
    if (list.length < lim) {
      const more = await this.challengeModel
        .find(baseFilter)
        .select('-testCases')
        .sort({ createdAt: -1 })
        .limit(lim * 2)
        .lean()
        .exec();
      const seen = new Set(list.map((c) => String(c._id)));
      for (const c of more) {
        if (list.length >= lim) break;
        const id = String(c._id);
        if (!seen.has(id)) {
          seen.add(id);
          list.push(c);
        }
      }
    }

    return {
      challenges: list.slice(0, lim).map((c: any) => ({
        id: String(c._id),
        title: c.title,
        difficulty: c.difficulty,
        tags: c.tags || [],
        xpReward: c.xpReward,
        languages: c.languages,
      })),
    };
  }

  async getChallengeAnalytics(challengeId: string) {
    if (!Types.ObjectId.isValid(challengeId)) {
      throw new BadRequestException('Invalid challenge ID');
    }

    const oid = new Types.ObjectId(challengeId);

    // Get users who solved the challenge (accepted submission)
    const solvedUsers = await this.submissionModel.aggregate([
      {
        $match: {
          challengeId: oid,
          status: 'accepted'
        }
      },
      {
        $group: {
          _id: '$userId',
          language: { $first: '$language' },
          solvedAt: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userInfo.username', 'Unknown'] },
          language: 1,
          solvedAt: 1
        }
      },
      {
        $sort: { solvedAt: -1 }
      }
    ]);

    // Get users who participated (any submission)
    const participatedUsers = await this.submissionModel.aggregate([
      {
        $match: {
          challengeId: oid
        }
      },
      {
        $group: {
          _id: '$userId',
          attempts: { $sum: 1 },
          lastAttempt: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          username: { $ifNull: ['$userInfo.username', 'Unknown'] },
          attempts: 1,
          lastAttempt: 1
        }
      },
      {
        $sort: { lastAttempt: -1 }
      }
    ]);

    return {
      solved: solvedUsers,
      participated: participatedUsers,
      statistics: {
        totalSolved: solvedUsers.length,
        totalParticipated: participatedUsers.length,
        avgAttempts: participatedUsers.length > 0 
          ? (participatedUsers.reduce((sum, u) => sum + u.attempts, 0) / participatedUsers.length).toFixed(2)
          : 0
      }
    };
  }
}
