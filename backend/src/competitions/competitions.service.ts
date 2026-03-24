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
  ) {}

  private mapLanguage(lang: string): string {
    return lang === 'cpp' ? 'c++' : lang;
  }

  private escapeRegex(raw: string): string {
    return raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

  /** Create sample competitions using the first available challenge. Call after seeding challenges. */
  async seedOne() {
    const result = await this.challengeService.findAll({ page: 1, limit: 1 } as any);
    const challenges = (result as any).challenges;
    if (!challenges?.length) {
      throw new BadRequestException('No challenges found. Seed challenges first (POST /challenges/seed).');
    }
    const challengeId = (challenges[0] as any)._id?.toString?.() ?? (challenges[0] as any)._id;

    const comps = [];

    // Active Competition
    const start1 = new Date();
    start1.setHours(start1.getHours() - 1);
    const end1 = new Date();
    end1.setDate(end1.getDate() + 3);

    const dto1: CreateCompetitionDto = {
      name: 'Global CodeSprint 2026',
      description: 'The ultimate battle of algorithms. Prove your speed and efficiency against developers worldwide.',
      type: 'speed',
      challengeIds: [challengeId],
      startTime: start1.toISOString(),
      endTime: end1.toISOString(),
      supportedLanguages: ['javascript', 'python', 'java', 'cpp'],
      rules: 'Submit a correct solution. Ranking: by execution time (ms), then by submission time.',
      prizes: ['$1000 First Place', 'Exclusive ByteBattle Hoodie', 'Special Profile Badge'],
      difficulty: 'hard',
    };
    comps.push(new this.competitionModel({
      ...dto1,
      challengeIds: dto1.challengeIds.map((id) => new Types.ObjectId(id)),
      startTime: new Date(dto1.startTime),
      endTime: new Date(dto1.endTime),
      supportedLanguages: dto1.supportedLanguages,
      status: 'active',
      participants: ['user-1', 'user-2', 'user-3'],
    }).save());

    // Scheduled Competition
    const start2 = new Date();
    start2.setDate(start2.getDate() + 2);
    const end2 = new Date();
    end2.setDate(end2.getDate() + 5);

    const dto2: CreateCompetitionDto = {
      name: 'Weekend Algorithmic Challenge',
      description: 'Top-tier problem solving challenge. Focus on code golf and algorithmic complexity.',
      type: 'algorithmic',
      challengeIds: [challengeId],
      startTime: start2.toISOString(),
      endTime: end2.toISOString(),
      supportedLanguages: ['python', 'javascript'],
      rules: 'Points are awarded based on tests passed and code execution time.',
      prizes: ['$500 Prize Pool', 'Premium Membership'],
      difficulty: 'expert',
    };
    comps.push(new this.competitionModel({
      ...dto2,
      challengeIds: dto2.challengeIds.map((id) => new Types.ObjectId(id)),
      startTime: new Date(dto2.startTime),
      endTime: new Date(dto2.endTime),
      supportedLanguages: dto2.supportedLanguages,
      status: 'scheduled',
      participants: [],
    }).save());

    // Scheduled short
    const start3 = new Date();
    start3.setMinutes(start3.getMinutes() + 5);
    const end3 = new Date();
    end3.setDate(end3.getDate() + 1);

    const dto3: CreateCompetitionDto = {
      name: 'Lightning Round Sprint',
      description: 'Quick challenge for fast coders. Solved in under 15 minutes recommended.',
      type: 'code_golf',
      challengeIds: [challengeId],
      startTime: start3.toISOString(),
      endTime: end3.toISOString(),
      supportedLanguages: ['javascript'],
      rules: 'Shortest code size wins.',
      prizes: ['200 XP', 'Quick Solver Badge'],
      difficulty: 'medium',
    };
    comps.push(new this.competitionModel({
      ...dto3,
      challengeIds: dto3.challengeIds.map((id) => new Types.ObjectId(id)),
      startTime: new Date(dto3.startTime),
      endTime: new Date(dto3.endTime),
      supportedLanguages: dto3.supportedLanguages,
      status: 'scheduled',
      participants: [],
    }).save());

    return Promise.all(comps);
  }

  async findAll(query: GetCompetitionsDto) {
    const {
      status,
      type,
      difficulty,
      language,
      search,
      sortBy = 'startTime',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (difficulty) filter.difficulty = difficulty;
    if (language) filter.supportedLanguages = language;
    if (search?.trim()) {
      const pattern = new RegExp(this.escapeRegex(search.trim()), 'i');
      filter.$or = [{ name: pattern }, { description: pattern }];
    }

    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (safePage - 1) * safeLimit;

    const sortField = sortBy === 'endTime' ? 'endTime' : 'startTime';

    if (sortBy === 'submissions') {
      const [competitions, total] = await Promise.all([
        this.competitionModel
          .aggregate([
            { $match: filter },
            {
              $lookup: {
                from: 'competitionsubmissions',
                localField: '_id',
                foreignField: 'competitionId',
                as: 'submissionRows',
              },
            },
            {
              $addFields: {
                totalSubmissions: { $size: '$submissionRows' },
              },
            },
            { $project: { submissionRows: 0 } },
            { $sort: { totalSubmissions: sortDirection, startTime: -1 } },
            { $skip: skip },
            { $limit: safeLimit },
          ])
          .exec(),
        this.competitionModel.countDocuments(filter),
      ]);

      return {
        competitions,
        total,
        page: safePage,
        totalPages: Math.ceil(total / safeLimit),
      };
    }

    const [competitions, total, counts] = await Promise.all([
      this.competitionModel
        .find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(safeLimit)
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
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
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
    competition.status = status;
    await competition.save();
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

  async update(competitionId: string, dto: any): Promise<CompetitionDocument> {
    const competition = await this.competitionModel.findById(competitionId).exec();
    if (!competition) throw new NotFoundException('Competition not found');

    // Update fields if provided
    if (dto.name !== undefined) competition.name = dto.name;
    if (dto.description !== undefined) competition.description = dto.description;
    if (dto.type !== undefined) competition.type = dto.type;
    if (dto.rules !== undefined) competition.rules = dto.rules;
    if (dto.prizes !== undefined) competition.prizes = dto.prizes;
    if (dto.difficulty !== undefined) competition.difficulty = dto.difficulty;
    
    // Handle dates and arrays - only update if not started
    if (competition.status === 'scheduled') {
      if (dto.startTime !== undefined) competition.startTime = new Date(dto.startTime);
      if (dto.endTime !== undefined) competition.endTime = new Date(dto.endTime);
      if (dto.challengeIds !== undefined) {
        competition.challengeIds = dto.challengeIds.map((id: string) => new Types.ObjectId(id));
      }
      if (dto.supportedLanguages !== undefined) competition.supportedLanguages = dto.supportedLanguages;
    }

    return competition.save();
  }

  async delete(competitionId: string): Promise<{ success: boolean; message: string }> {
    const competition = await this.competitionModel.findById(competitionId).exec();
    if (!competition) throw new NotFoundException('Competition not found');

    // Prevent deletion of active or closed competitions
    if (competition.status === 'active' || competition.status === 'closed') {
      throw new BadRequestException('Cannot delete active or closed competitions');
    }

    await this.competitionModel.findByIdAndDelete(competitionId).exec();
    return { success: true, message: 'Competition deleted successfully' };
  }
}
