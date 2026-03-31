/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Competition, CompetitionDocument, CompetitionType } from './schemas/competition.schema';
import {
  CompetitionSubmission,
  CompetitionSubmissionDocument,
} from './schemas/competition-submission.schema';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { SubmitCompetitionDto } from './dto/submit-competition.dto';
import { GetCompetitionsDto } from './dto/get-competitions.dto';
import { ChallengeService } from '../challenges/challenges.service';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { GamificationService } from '../gamification/gamification.service';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

function devCompetitionSeedAllowed(): boolean {
  return (
    process.env.ENABLE_DEV_CHALLENGE_SEED === 'true' ||
    process.env.ENABLE_DEV_COMPETITION_SEED === 'true'
  );
}

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition.name)
    private competitionModel: Model<CompetitionDocument>,
    @InjectModel(CompetitionSubmission.name)
    private submissionModel: Model<CompetitionSubmissionDocument>,
    private challengeService: ChallengeService,
    private codeExecution: CodeExecutionService,
    private gamificationService: GamificationService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  private mapLanguage(lang: string): string {
    return lang === 'cpp' ? 'c++' : lang;
  }

  async create(dto: CreateCompetitionDto): Promise<CompetitionDocument> {
    const doc = new this.competitionModel({
      ...dto,
      challengeIds: dto.challengeIds.map((id) => new Types.ObjectId(id)),
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      supportedLanguages: dto.supportedLanguages ?? ['javascript', 'python', 'java', 'cpp'],
      status: 'scheduled',
    });
    return doc.save();
  }

  /** Create one sample competition using the first available challenge. Call after seeding challenges. */
  async seedOne(): Promise<CompetitionDocument> {
    const result = await this.challengeService.findAll({ page: 1, limit: 1 } as any);
    const challenges = (result as any).challenges;
    if (!challenges?.length) {
      throw new BadRequestException('No challenges found. Seed challenges first (POST /challenges/seed).');
    }
    const challengeId = (challenges[0] as any)._id?.toString?.() ?? (challenges[0] as any)._id;
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 7);
    const dto: CreateCompetitionDto = {
      name: 'Weekly Speed Challenge',
      description: 'Solve the Reverse a String challenge as fast as you can. Lowest execution time wins. Tie-breaker: earliest submission.',
      type: 'speed',
      challengeIds: [challengeId],
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      rules: 'Submit a correct solution. Ranking: by execution time (ms), then by submission time.',
    };
    const doc = new this.competitionModel({
      ...dto,
      challengeIds: dto.challengeIds.map((id) => new Types.ObjectId(id)),
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      supportedLanguages: dto.supportedLanguages ?? ['javascript', 'python', 'java', 'cpp'],
      status: 'active',
    });
    return doc.save();
  }

  /**
   * Insert multiple sample competitions (contests) linked to existing challenges.
   * Idempotent by name. Requires ENABLE_DEV_CHALLENGE_SEED or ENABLE_DEV_COMPETITION_SEED.
   */
  async seedSampleContests(): Promise<{
    created: { id: string; name: string }[];
    skipped: string[];
  }> {
    if (!devCompetitionSeedAllowed()) {
      throw new ForbiddenException(
        'Set ENABLE_DEV_COMPETITION_SEED=true or ENABLE_DEV_CHALLENGE_SEED=true in .env',
      );
    }
    const result = await this.challengeService.findAll({ page: 1, limit: 20 } as any);
    const challenges = (result as any).challenges as { _id: Types.ObjectId }[];
    if (!challenges?.length) {
      throw new BadRequestException(
        'No challenges found. Seed challenges first (POST /challenges/seed or dev triple).',
      );
    }
    const oid = (i: number) => new Types.ObjectId(challenges[i]._id);
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 14);

    const specs: Array<{
      name: string;
      description: string;
      type: CompetitionType;
      indices: number[];
      rules: string;
    }> = [
      {
        name: '[Dev] Speed Contest',
        description: 'Fastest correct solution wins. Uses the first seeded challenge.',
        type: 'speed',
        indices: [0],
        rules: 'Ranking: execution time (ms), then submission time.',
      },
      {
        name: '[Dev] Code Golf Contest',
        description: 'Shortest source code wins. Same challenge as speed contest.',
        type: 'code_golf',
        indices: [0],
        rules: 'Ranking: character count (excluding whitespace optional — server uses raw length).',
      },
    ];
    if (challenges.length >= 3) {
      specs.push({
        name: '[Dev] Algorithmic Contest',
        description: 'Multi-challenge contest using the first three challenges.',
        type: 'algorithmic',
        indices: [0, 1, 2],
        rules: 'Complete all challenges; ranking by aggregate score.',
      });
    }

    const created: { id: string; name: string }[] = [];
    const skipped: string[] = [];

    for (const s of specs) {
      const exists = await this.competitionModel.findOne({ name: s.name }).lean().exec();
      if (exists) {
        skipped.push(s.name);
        continue;
      }
      const doc = await new this.competitionModel({
        name: s.name,
        description: s.description,
        type: s.type,
        challengeIds: s.indices.map((i) => oid(i)),
        startTime: now,
        endTime: end,
        supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
        rules: s.rules,
        status: 'active' as const,
        participants: [],
      }).save();
      created.push({ id: doc._id.toString(), name: s.name });
    }

    return { created, skipped };
  }

  async findAll(query: GetCompetitionsDto) {
    const { status, page = 1, limit = 20 } = query;
    const filter: any = {};
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [competitions, total, counts] = await Promise.all([
      this.competitionModel
        .find(filter)
        .sort({ startTime: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean()
        .exec(),
      this.competitionModel.countDocuments(filter),
      this.submissionModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $group: { _id: '$competitionId', count: { $sum: 1 } } },
      ]).exec(),
    ]);
    const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
    const competitionsWithCount = (competitions as any[]).map((c) => ({
      ...c,
      totalSubmissions: countMap.get((c._id || c).toString()) ?? 0,
    }));
    return {
      competitions: competitionsWithCount,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async findOne(id: string) {
    const competition = await this.competitionModel.findById(id).lean().exec();
    if (!competition) throw new NotFoundException('Competition not found');
    const totalSubmissions = await this.submissionModel.countDocuments({ competitionId: new Types.ObjectId(id) }).exec();
    return { ...competition, totalSubmissions };
  }

  async join(competitionId: string, userId: string) {
    const competition = await this.competitionModel.findById(competitionId).exec();
    if (!competition) throw new NotFoundException('Competition not found');
    if (competition.status !== 'scheduled' && competition.status !== 'active') {
      throw new BadRequestException('Competition is not open for joining');
    }
    const uid = userId.toString();
    if (!competition.participants.includes(uid)) {
      competition.participants.push(uid);
      await competition.save();
      void this.notificationsService
        .create({
          userId,
          type: 'competition_joined',
          title: 'Registration confirmed',
          body: `You joined the competition "${competition.name}".`,
          meta: { href: `/competitions/${competitionId}`, competitionId },
        })
        .catch(() => undefined);
    }
    return { success: true };
  }

  /** Compute numeric score for ranking: code_golf/speed lower is better; algorithmic higher is better. */
  private computeScore(
    type: CompetitionType,
    passedTests: number,
    totalTests: number,
    executionTimeMs: number,
    codeBytes: number,
  ): number {
    switch (type) {
      case 'code_golf':
        return codeBytes;
      case 'speed':
        return executionTimeMs;
      case 'algorithmic':
        return passedTests * 1e6 - Math.min(executionTimeMs, 1e6 - 1);
      default:
        return 0;
    }
  }

  /** Return true if new submission is better than old (by competition type). */
  private isBetter(
    type: CompetitionType,
    newScore: number,
    newTime: number,
    newCreated: Date,
    oldScore: number,
    oldTime: number,
    oldCreated: Date,
  ): boolean {
    if (type === 'algorithmic') {
      if (newScore !== oldScore) return newScore > oldScore;
      if (newTime !== oldTime) return newTime < oldTime;
      return newCreated.getTime() < oldCreated.getTime();
    }
    if (newScore !== oldScore) return newScore < oldScore;
    return newCreated.getTime() < oldCreated.getTime();
  }

  async submit(competitionId: string, userId: string, dto: SubmitCompetitionDto) {
    const competition = await this.competitionModel.findById(competitionId).exec();
    if (!competition) throw new NotFoundException('Competition not found');
    if (competition.status !== 'active') {
      throw new ForbiddenException('Submissions are only accepted while the competition is active');
    }
    const now = new Date();
    if (now < new Date(competition.startTime) || now > new Date(competition.endTime)) {
      throw new ForbiddenException('Competition is outside the active time window');
    }
    const challengeId =
      dto.challengeId ||
      (competition.challengeIds && competition.challengeIds[0]?.toString()) ||
      null;
    if (!challengeId) throw new BadRequestException('No challenge configured for this competition');
    if (!competition.supportedLanguages?.includes(dto.language)) {
      throw new BadRequestException(`Language ${dto.language} is not supported`);
    }

    const challenge = await this.challengeService.getChallengeWithTestCases(challengeId);
    const rawTestCases = (challenge as any).testCases as Array<{
      input?: string;
      expectedOutput?: string;
    }> | undefined;
    if (!rawTestCases?.length) {
      throw new BadRequestException('Challenge has no test cases');
    }
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
    const passedTests = out.overall.passed;
    const totalTests = testCases.length;
    const totalTimeMs = out.results.reduce((sum: number, r: any) => sum + (r.executionTime || 0), 0);
    const executionTimeMs = totalTests ? Math.round(totalTimeMs / totalTests) : 0;
    const allPassed = passedTests === totalTests;
    const status = allPassed
      ? 'accepted'
      : out.results.some((r: any) => r.error)
        ? 'runtime_error'
        : 'wrong_answer';

    const codeBytes = Buffer.byteLength(dto.code, 'utf8');
    const score = this.computeScore(
      competition.type as CompetitionType,
      passedTests,
      totalTests,
      executionTimeMs,
      codeBytes,
    );

    const compId = new Types.ObjectId(competitionId);
    const uid = new Types.ObjectId(userId);
    const chId = new Types.ObjectId(challengeId);

    const previousBest = await this.submissionModel
      .findOne({ competitionId: compId, userId: uid, challengeId: chId, isBest: true })
      .lean()
      .exec();

    let isBest = false;
    if (allPassed) {
      if (!previousBest) {
        isBest = true;
      } else {
        const prevCreated = (previousBest as any).createdAt;
        isBest = this.isBetter(
          competition.type as CompetitionType,
          score,
          executionTimeMs,
          now,
          (previousBest as any).score,
          (previousBest as any).executionTimeMs ?? 0,
          prevCreated ? new Date(prevCreated) : now,
        );
      }
    }

    if (isBest && previousBest) {
      await this.submissionModel
        .updateOne({ _id: (previousBest as any)._id }, { $set: { isBest: false } })
        .exec();
    }

    const submission = await new this.submissionModel({
      userId: uid,
      competitionId: compId,
      challengeId: chId,
      code: dto.code,
      language: dto.language,
      status,
      score,
      executionTimeMs,
      passedTests,
      totalTests,
      isBest,
    }).save();

    if (!competition.participants.includes(userId)) {
      competition.participants.push(userId);
      await competition.save();
    }

    const submissionCount = await this.submissionModel
      .countDocuments({ competitionId: compId, userId: uid })
      .exec();
    if (submissionCount === 1) {
      await this.gamificationService.recordCompetitionParticipated(userId);
    }

    return {
      status,
      passedTests,
      totalTests,
      score,
      executionTimeMs,
      isBest,
      submissionId: (submission as any)._id.toString(),
    };
  }

  async getLeaderboard(
    competitionId: string,
    options?: { language?: string; limit?: number },
  ) {
    const competition = await this.competitionModel.findById(competitionId).lean().exec();
    if (!competition) throw new NotFoundException('Competition not found');
    const limit = Math.min(100, options?.limit ?? 50);
    const type = competition.type as CompetitionType;

    const bestSubs = await this.submissionModel
      .aggregate([
        { $match: { competitionId: new Types.ObjectId(competitionId), isBest: true } },
        ...(options?.language ? [{ $match: { language: options.language } }] : []),
        { $sort: type === 'algorithmic' ? { score: -1, executionTimeMs: 1, createdAt: 1 } : { score: 1, createdAt: 1 } },
        { $limit: limit * 2 },
      ])
      .exec();

    const seen = new Set<string>();
    const entries: Array<{
      rank: number;
      userId: string;
      username?: string;
      score: number;
      executionTimeMs: number;
      language: string;
      submittedAt: Date;
    }> = [];
    for (const s of bestSubs) {
      const uid = s.userId?.toString();
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      entries.push({
        rank: entries.length + 1,
        userId: uid,
        score: s.score,
        executionTimeMs: s.executionTimeMs ?? 0,
        language: s.language,
        submittedAt: s.createdAt,
      });
      if (entries.length >= limit) break;
    }

    const userIds = entries.map((e) => e.userId);
    const users = await this.usersService.findByIds(userIds);
    const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));
    entries.forEach((e) => {
      const u = userMap.get(e.userId);
      if (u) e.username = u.username;
    });

    return { competitionId, type, entries };
  }

  async updateStatus(competitionId: string, status: 'scheduled' | 'active' | 'closed' | 'archived') {
    const competition = await this.competitionModel.findById(competitionId).exec();
    if (!competition) throw new NotFoundException('Competition not found');
    const prevStatus = competition.status;
    competition.status = status;
    await competition.save();
    const name = competition.name;
    const participants = competition.participants || [];

    if (status === 'active' && prevStatus !== 'active') {
      for (const uid of participants) {
        void this.notificationsService
          .create({
            userId: uid,
            type: 'competition_active',
            title: 'Competition is live',
            body: `"${name}" is now active. You can submit your solutions.`,
            meta: { href: `/competitions/${competitionId}`, competitionId },
          })
          .catch(() => undefined);
      }
    }

    if (status === 'closed' && prevStatus !== 'closed') {
      for (const uid of participants) {
        void this.notificationsService
          .create({
            userId: uid,
            type: 'competition_closed',
            title: 'Competition ended',
            body: `"${name}" is now closed. Check the leaderboard.`,
            meta: { href: `/competitions/${competitionId}`, competitionId },
          })
          .catch(() => undefined);
      }
    }

    if (status === 'closed') {
      await this.finalizeCompetition(competitionId);
    }
    return competition;
  }

  async finalizeCompetition(competitionId: string) {
    const { entries } = await this.getLeaderboard(competitionId, { limit: 500 });
    const total = entries.length;
    for (let i = 0; i < entries.length; i++) {
      await this.gamificationService.recordCompetitionResult(entries[i].userId, {
        competitionId,
        rank: i + 1,
        totalParticipants: total,
      });
    }
  }

  async getHistory(params: GetCompetitionsDto) {
    return this.findAll({
      ...params,
      status: params.status ?? 'archived',
    });
  }
}
