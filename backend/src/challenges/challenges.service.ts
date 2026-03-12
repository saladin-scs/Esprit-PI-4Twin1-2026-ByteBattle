/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Challenge, ChallengeDocument, Language } from './schemas/challenge.schema';
import { Submission, SubmissionDocument } from './schemas/Submission.schema';
import { Solution, SolutionDocument } from './schemas/solution.schema';
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto } from './dto/create-challenge.dto';
import { CreateSolutionDto } from './dto/solution.dto';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class ChallengeService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Solution.name) private solutionModel: Model<SolutionDocument>,
    private codeExecution: CodeExecutionService,
    private usersService: UsersService,
  ) {}

  /** Map challenge language to code-execution (Piston uses c++, local uses cpp) */
  private mapLanguage(lang: string): string {
    return lang === 'cpp' ? 'c++' : lang;
  }

  /** Default starter code when challenge has none (works with normalized stdin: space or comma-separated) */
  private static readonly DEFAULT_STARTER_CODE: Record<Language, string> = {
    python: 'def sum(a, b):\n    return a + b\n\na, b = map(int, input().split())\nprint(sum(a, b))',
    javascript: 'function sum(a, b) {\n  return a + b;\n}\n\nconst [a, b] = readline().split(/\\s+/).map(Number);\nconsole.log(sum(a, b));',
    java: 'public class Solution {\n    public static int sum(int a, int b) {\n        return a + b;\n    }\n    public static void main(String[] args) {\n        String[] parts = new java.util.Scanner(System.in).nextLine().trim().split("\\\\s+");\n        int a = Integer.parseInt(parts[0]);\n        int b = Integer.parseInt(parts[1]);\n        System.out.println(sum(a, b));\n    }\n}',
    cpp: '#include <iostream>\nusing namespace std;\nint sum(int a, int b) { return a + b; }\nint main() { int a, b; cin >> a >> b; cout << sum(a, b); return 0; }',
  };

  // ─── XP par difficulté ───────────────────────────────────────────────────
  private readonly XP_MAP = { easy: 50, medium: 100, hard: 200, expert: 400 };

  // ─── Créer un challenge (admin) ──────────────────────────────────────────
  async create(dto: CreateChallengeDto): Promise<ChallengeDocument> {
    if (!dto.xpReward) {
      dto.xpReward = this.XP_MAP[dto.difficulty] ?? 50;
    }
    return new this.challengeModel(dto).save();
  }

  // ─── Liste des challenges (publique) ────────────────────────────────────
  async findAll(query: GetChallengesDto) {
    const { difficulty, language, tag, search, page = 1, limit = 20 } = query;
    const filter: any = { isPublished: true };

    if (difficulty) filter.difficulty = difficulty;
    if (language)   filter.languages = language;
    if (tag)        filter.tags = tag;
    if (search)     filter.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);

    const [challenges, total] = await Promise.all([
      this.challengeModel
        .find(filter)
        .select('-testCases') // ← ne jamais envoyer les tests au frontend
        .sort({ difficulty: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      this.challengeModel.countDocuments(filter),
    ]);

    return {
      challenges,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  // ─── Détail d'un challenge ───────────────────────────────────────────────
  async findOne(id: string): Promise<ChallengeDocument> {
    const challenge = await this.challengeModel
      .findById(id)
      .select('-testCases') // ← ne jamais exposer les tests
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');
    const starterCode: Record<Language, string> = { ...ChallengeService.DEFAULT_STARTER_CODE };
    for (const lang of (challenge.languages || []) as Language[]) {
      if ((challenge as any).starterCode?.[lang]) {
        starterCode[lang] = (challenge as any).starterCode[lang];
      }
    }
    return { ...challenge, starterCode } as unknown as ChallengeDocument;
  }

  // ─── Run (examples only) — single code-execution service (Piston + local fallback) ─
  async run(challengeId: string, dto: SubmitChallengeDto) {
    const challenge = await this.challengeModel.findById(challengeId).exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');
    if (!challenge.languages.includes(dto.language as any)) {
      throw new BadRequestException(`Le langage ${dto.language} n'est pas supporté`);
    }
    const examples = (challenge as any).examples || [];
    if (!examples.length) {
      return { results: [], overall: { passed: 0, total: 0 }, message: 'Aucun exemple pour ce challenge' };
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

  // ─── Soumettre une solution ──────────────────────────────────────────────
  async submit(challengeId: string, userId: string, dto: SubmitChallengeDto) {
    // 1. Charger le challenge AVEC les testCases (select: false dans le schema)
    const challenge = await this.challengeModel
      .findById(challengeId)
      .select('+testCases')
      .lean()
      .exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');

    const languages = (challenge as any).languages as string[] | undefined;
    if (!languages?.includes(dto.language)) {
      throw new BadRequestException(`Le langage ${dto.language} n'est pas supporté pour ce challenge`);
    }

    const rawTestCases = (challenge as any).testCases as Array<{ input?: string; expectedOutput?: string }> | undefined;
    if (!rawTestCases?.length) {
      throw new BadRequestException('Ce challenge n\'a pas de tests configurés');
    }

    // 2. Exécuter le code (code-execution module: Piston + fallback local)
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

    // 3. Calculer XP (seulement si accepted + première fois)
    let xpEarned = 0;
    if (allPassed) {
      const alreadyAccepted = await this.submissionModel.findOne({
        userId: new Types.ObjectId(userId),
        challengeId: new Types.ObjectId(challengeId),
        status: 'accepted',
      });
      if (!alreadyAccepted) {
        xpEarned = (challenge as any).xpReward ?? this.XP_MAP[(challenge as any).difficulty] ?? 50;
      }
    }

    // 4. Sauvegarder la soumission
    const submission = await new this.submissionModel({
      userId: new Types.ObjectId(userId),
      challengeId: new Types.ObjectId(challengeId),
      code: dto.code,
      language: dto.language,
      status,
      testResults,
      passedTests,
      totalTests,
      xpEarned,
      executionTimeMs: Math.round(totalTimeMs / totalTests),
    }).save();

    // 5. Mettre à jour les stats du challenge
    await this.challengeModel.findByIdAndUpdate(challengeId, {
      $inc: {
        totalSubmissions: 1,
        ...(allPassed ? { totalAccepted: 1 } : {}),
      },
    });

    // 6. Gamification: attribuer XP à l'utilisateur si gagné (met à jour xp, totalChallengesSolved, rankTier)
    if (xpEarned > 0) {
      await this.usersService.addXpForChallenge(userId, xpEarned);
    }

    return {
      status,
      passedTests,
      totalTests,
      xpEarned,
      executionTimeMs: Math.round(totalTimeMs / totalTests),
      testResults: testResults.map((r, i) => ({
        testNumber: i + 1,
        passed: r.passed,
        // On n'expose l'input/output attendu que si le test a échoué (feedback pédagogique)
        ...(r.passed ? {} : {
          input: r.input,
          expectedOutput: r.expectedOutput,
          actualOutput: r.actualOutput,
          error: r.error,
        }),
      })),
    };
  }

  // ─── Historique des soumissions d'un user ───────────────────────────────
  async getUserSubmissions(userId: string, challengeId?: string) {
    const filter: any = { userId: new Types.ObjectId(userId) };
    if (challengeId) filter.challengeId = new Types.ObjectId(challengeId);

    return this.submissionModel
      .find(filter)
      .populate('challengeId', 'title difficulty')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
      .exec();
  }

  // ─── Stats d'un challenge ────────────────────────────────────────────────
  async getStats(challengeId: string) {
    const challenge = await this.challengeModel.findById(challengeId).select('totalSubmissions totalAccepted difficulty xpReward').lean().exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');
    const acceptanceRate = challenge.totalSubmissions > 0
      ? Math.round((challenge.totalAccepted / challenge.totalSubmissions) * 100)
      : 0;
    return { ...challenge, acceptanceRate };
  }

  // ─── Communauté : Solutions ──────────────────────────────────────────────
  async createSolution(userId: string, challengeId: string, dto: CreateSolutionDto) {
    const challenge = await this.challengeModel.findById(challengeId).select('_id').exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');

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
    if (!solution) throw new NotFoundException('Solution non trouvée');

    const uid = new Types.ObjectId(userId);
    const hasUpvoted = solution.upvotedBy.some(id => id.equals(uid));

    if (hasUpvoted) {
      // Remove upvote
      return this.solutionModel.findByIdAndUpdate(
        solutionId,
        { $inc: { upvotes: -1 }, $pull: { upvotedBy: uid } },
        { new: true }
      ).populate('userId', 'username avatarUrl').lean();
    } else {
      // Add upvote
      return this.solutionModel.findByIdAndUpdate(
        solutionId,
        { $inc: { upvotes: 1 }, $push: { upvotedBy: uid } },
        { new: true }
      ).populate('userId', 'username avatarUrl').lean();
    }
  }
}