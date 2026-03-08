/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Challenge, ChallengeDocument } from './schemas/challenge.schema';
import { Submission, SubmissionDocument } from './schemas/Submission.schema';
import { Solution, SolutionDocument } from './schemas/solution.schema';
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto } from './dto/create-challenge.dto';
import { CreateSolutionDto } from './dto/solution.dto';
import { CodeExecutorService } from './code-executor.service';

@Injectable()
export class ChallengeService {
  constructor(
    @InjectModel(Challenge.name) private challengeModel: Model<ChallengeDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<SubmissionDocument>,
    @InjectModel(Solution.name) private solutionModel: Model<SolutionDocument>,
    private codeExecutor: CodeExecutorService,
  ) {}

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
      .exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');
    return challenge;
  }

  // ─── Soumettre une solution ──────────────────────────────────────────────
  async submit(challengeId: string, userId: string, dto: SubmitChallengeDto) {
    // 1. Charger le challenge AVEC les testCases (select: false dans le schema)
    const challenge = await this.challengeModel
      .findById(challengeId)
      .select('+testCases')
      .exec();
    if (!challenge) throw new NotFoundException('Challenge non trouvé');

    if (!challenge.languages.includes(dto.language as any)) {
      throw new BadRequestException(`Le langage ${dto.language} n'est pas supporté pour ce challenge`);
    }

    if (!challenge.testCases?.length) {
      throw new BadRequestException('Ce challenge n\'a pas de tests configurés');
    }

    // 2. Exécuter le code sur chaque test case
    const testResults: any[] = [];
    let passedTests = 0;
    let totalTimeMs = 0;

    for (const tc of challenge.testCases) {
      const result = await this.codeExecutor.execute(dto.code, dto.language, tc.input);
      totalTimeMs += result.executionTimeMs;

      const actualOutput = result.output?.trim() ?? '';
      const expectedOutput = tc.expectedOutput?.trim() ?? '';
      const passed = !result.error && actualOutput === expectedOutput;

      if (passed) passedTests++;

      testResults.push({
        input: tc.input,
        expectedOutput,
        actualOutput,
        passed,
        error: result.error,
      });
    }

    const totalTests = challenge.testCases.length;
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
        xpEarned = challenge.xpReward ?? this.XP_MAP[challenge.difficulty] ?? 50;
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

    // 6. Attribuer XP à l'utilisateur si gagné
    if (xpEarned > 0) {
      const { Model: UserModel } = await import('mongoose');
      // On utilise une mise à jour directe via mongoose pour ne pas créer de dépendance circulaire
      const mongoose = await import('mongoose');
      const UserSchema = mongoose.model('User');
      await UserSchema.findByIdAndUpdate(userId, { $inc: { xp: xpEarned, totalChallengesSolved: 1 } });
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