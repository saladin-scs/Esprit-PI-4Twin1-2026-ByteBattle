/* eslint-disable prettier/prettier */
import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Battle, BattleDocument } from './schemas/battle.schema';
import { ChallengeService } from '../challenges/challenges.service';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { BattleRealtimeService } from './battle-realtime.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  inferTeamIndexFromPosition,
  resolveBattleOutcome,
  type BattleFormat,
} from './battle-winner.util';

const MAX_SUBMITS_PER_PLAYER = Math.max(1, Number(process.env.BATTLE_MAX_SUBMITS_PER_PLAYER || 3));

export type BattleQueueMode = BattleFormat;

type QueuedCombatant = {
  userId: string;
  username: string;
  socketId: string | null;
  mode: BattleQueueMode;
};

const PLAYERS_NEEDED: Record<BattleQueueMode, number> = {
  '1v1': 2,
  '2v2': 4,
  '3v3': 6,
  '4v4': 8,
  '5v5': 10,
};

/** HTTP + WebSocket: normalize client mode string */
export function normalizeBattleQueueMode(raw: unknown): BattleQueueMode {
  if (raw === '2v2' || raw === '3v3' || raw === '4v4' || raw === '5v5') return raw;
  return '1v1';
}

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);
  private readonly queues: Record<BattleQueueMode, QueuedCombatant[]> = {
    '1v1': [],
    '2v2': [],
    '3v3': [],
    '4v4': [],
    '5v5': [],
  };
  private readonly queueUserIds = new Set<string>();
  private readonly schedulers = new Map<
    string,
    { interval?: NodeJS.Timeout; timeout?: NodeJS.Timeout }
  >();

  constructor(
    @InjectModel(Battle.name) private readonly battleModel: Model<BattleDocument>,
    private readonly challengeService: ChallengeService,
    private readonly codeExecution: CodeExecutionService,
    private readonly realtime: BattleRealtimeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private defaultDurationSeconds(): number {
    const n = Number(process.env.BATTLE_DURATION_SECONDS || 600);
    return Number.isFinite(n) ? Math.min(7200, Math.max(30, Math.floor(n))) : 600;
  }

  dequeueUser(userId: string): void {
    if (!this.queueUserIds.has(userId)) return;
    for (const mode of Object.keys(this.queues) as BattleQueueMode[]) {
      const q = this.queues[mode];
      const idx = q.findIndex((x) => x.userId === userId);
      if (idx >= 0) {
        q.splice(idx, 1);
        this.queueUserIds.delete(userId);
        return;
      }
    }
  }

  dequeueBySocket(socketId: string): void {
    for (const mode of Object.keys(this.queues) as BattleQueueMode[]) {
      const q = this.queues[mode];
      const idx = q.findIndex((x) => x.socketId === socketId);
      if (idx >= 0) {
        const [removed] = q.splice(idx, 1);
        this.queueUserIds.delete(removed.userId);
        return;
      }
    }
  }

  private teamRosterFromBattle(battle: BattleDocument) {
    const teams: Array<{ teamIndex: number; members: Array<{ userId: string; username: string }> }> = [
      { teamIndex: 0, members: [] },
      { teamIndex: 1, members: [] },
    ];
    battle.players.forEach((p, i) => {
      const ti =
        typeof (p as any).teamIndex === 'number'
          ? (p as any).teamIndex
          : inferTeamIndexFromPosition(i, battle.players.length);
      teams[ti]?.members.push({ userId: String(p.userId), username: p.username });
    });
    return teams;
  }

  private async persistMatchedBattle(lobby: QueuedCombatant[], format: BattleFormat): Promise<BattleDocument> {
    const pick = await this.challengeService.pickRandomPublishedChallengeForBattle();
    if (!pick) throw new ServiceUnavailableException('No published challenges available for battles');
    const durationSeconds = this.defaultDurationSeconds();
    const half = lobby.length / 2;
    const players = lobby.map((q, i) => ({
      userId: new Types.ObjectId(q.userId),
      username: q.username,
      teamIndex: i < half ? 0 : 1,
      isReady: false,
      submitted: false,
      submissionTime: null,
      submitAttempts: 0,
    }));
    const battle = await this.battleModel.create({
      mode: format,
      challengeId: pick._id,
      status: 'waiting',
      durationSeconds,
      startedAt: null,
      endsAt: null,
      players,
      submissions: [],
      winnerId: null,
      winnerTeamIndex: null,
      draw: false,
    });
    return battle;
  }

  /** Used by gateway: enqueue then await create if enough players matched. */
  async notifyBattleMatched(battle: BattleDocument): Promise<void> {
    const ch = await this.challengeService.findOne(String(battle.challengeId));
    this.emitBattleFound(battle, ch.title);
  }

  async enqueueAndMaybeMatch(player: QueuedCombatant): Promise<{ battle: BattleDocument | null }> {
    const mode = player.mode;
    const q = this.queues[mode];
    const needed = PLAYERS_NEEDED[mode];

    if (this.queueUserIds.has(player.userId)) {
      const idx = q.findIndex((x) => x.userId === player.userId);
      if (idx >= 0) {
        q[idx].socketId = player.socketId ?? q[idx].socketId;
        q[idx].username = player.username;
      }
      return { battle: null };
    }
    q.push({ ...player });
    this.queueUserIds.add(player.userId);
    if (q.length < needed) return { battle: null };

    const batch = q.splice(0, needed);
    for (const b of batch) this.queueUserIds.delete(b.userId);
    const battle = await this.persistMatchedBattle(batch, mode);
    return { battle };
  }

  emitBattleFound(battle: BattleDocument, challengeTitle: string): void {
    const id = String(battle._id);
    const teams = this.teamRosterFromBattle(battle);
    for (const p of battle.players) {
      const uid = String(p.userId);
      const myTi =
        typeof (p as any).teamIndex === 'number'
          ? (p as any).teamIndex
          : inferTeamIndexFromPosition(
              battle.players.findIndex((x) => String(x.userId) === uid),
              battle.players.length,
            );
      const enemyTeam = teams.find((t) => t.teamIndex !== myTi);
      const opponent =
        battle.mode === '1v1' && enemyTeam?.members?.length === 1
          ? { userId: enemyTeam.members[0].userId, username: enemyTeam.members[0].username }
          : null;
      this.realtime.emitToUser(uid, 'battle_found', {
        battleId: id,
        challengeId: String(battle.challengeId),
        challengeTitle,
        mode: battle.mode,
        durationSeconds: battle.durationSeconds,
        serverTime: new Date().toISOString(),
        teams,
        yourTeamIndex: myTi,
        opponent,
      });

      void this.notificationsService
        .create({
          userId: uid,
          type: 'battle_found',
          title: 'Battle matched',
          body: `Your ${battle.mode} battle is ready on "${challengeTitle}".`,
          meta: { href: `/battle/room/${id}`, battleId: id, challengeId: String(battle.challengeId) },
        })
        .catch(() => undefined);
    }
  }

  private notifyBattleResult(battle: BattleDocument): void {
    const winnerId = battle.winnerId ? String(battle.winnerId) : null;
    const draw = Boolean((battle as any).draw);
    const battleId = String(battle._id);

    for (const p of battle.players) {
      const userId = String(p.userId);
      const isWinner = winnerId === userId;
      const title = draw ? 'Battle finished (draw)' : isWinner ? 'Battle won' : 'Battle lost';
      const body = draw
        ? `Your ${battle.mode} battle ended in a draw.`
        : isWinner
          ? `Great job. You won your ${battle.mode} battle.`
          : `Your ${battle.mode} battle ended. Keep pushing for the next one.`;

      void this.notificationsService
        .create({
          userId,
          type: draw ? 'battle_draw' : isWinner ? 'battle_won' : 'battle_lost',
          title,
          body,
          meta: { href: `/battle/result/${battleId}`, battleId, result: draw ? 'draw' : isWinner ? 'win' : 'loss' },
        })
        .catch(() => undefined);
    }
  }

  async markPlayerReady(battleId: string, userId: string): Promise<BattleDocument | null> {
    const uid = new Types.ObjectId(userId);
    const battle = await this.battleModel.findById(battleId).exec();
    if (!battle) return null;
    const isPlayer = battle.players.some((p) => p.userId.equals(uid));
    if (!isPlayer) throw new ForbiddenException('Not part of this battle');

    if (battle.status !== 'waiting') return battle;

    await this.battleModel.updateOne(
      { _id: battle._id, status: 'waiting' },
      { $set: { 'players.$[p].isReady': true } },
      { arrayFilters: [{ 'p.userId': uid }] },
    );

    const fresh = await this.battleModel.findById(battleId).exec();
    if (!fresh || fresh.status !== 'waiting') return fresh;
    if (!fresh.players.every((p) => p.isReady)) return fresh;

    const activated = await this.tryActivateBattle(battleId);
    if (activated) {
      await this.emitBattleStart(activated);
      this.scheduleBattleSchedulers(battleId, activated.endsAt!);
    }
    return activated ?? fresh;
  }

  async tryActivateBattle(battleId: string): Promise<BattleDocument | null> {
    const snap = await this.battleModel.findById(battleId).lean();
    if (!snap || snap.status !== 'waiting') return null;
    if (!snap.players?.every((p: { isReady?: boolean }) => p.isReady)) return null;
    const now = new Date();
    const endsAt = new Date(now.getTime() + snap.durationSeconds * 1000);
    return this.battleModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(battleId), status: 'waiting' },
        { $set: { status: 'active', startedAt: now, endsAt } },
        { new: true },
      )
      .exec();
  }

  async buildBattleStartPayload(battle: BattleDocument): Promise<Record<string, unknown>> {
    const id = String(battle._id);
    const challenge = await this.challengeService.findOne(String(battle.challengeId));
    return {
      battleId: id,
      mode: battle.mode,
      teams: this.teamRosterFromBattle(battle),
      startedAt: battle.startedAt?.toISOString(),
      endsAt: battle.endsAt?.toISOString(),
      durationSeconds: battle.durationSeconds,
      challenge: {
        _id: String(challenge._id),
        title: challenge.title,
        description: challenge.description,
        difficulty: challenge.difficulty,
        examples: challenge.examples,
        constraints: challenge.constraints,
        languages: challenge.languages,
        starterCode: (challenge as any).starterCode,
      },
    };
  }

  private async emitBattleStart(battle: BattleDocument): Promise<void> {
    const id = String(battle._id);
    const payload = await this.buildBattleStartPayload(battle);
    this.realtime.emitToBattleRoom(id, 'battle_start', payload);
  }

  /** Reconnect / refresh: single-socket state without re-broadcasting to the whole room. */
  async emitBattleSyncToSocket(battleId: string, socketId: string, userId: string): Promise<void> {
    const battle = await this.battleModel.findById(battleId).exec();
    if (!battle) return;
    const uid = new Types.ObjectId(userId);
    if (!battle.players.some((p) => p.userId.equals(uid))) return;

    if (battle.status === 'active' && battle.endsAt) {
      const payload = await this.buildBattleStartPayload(battle);
      this.realtime.emitToSocket(socketId, 'battle_sync', payload);
      const remainingSeconds = Math.max(
        0,
        Math.ceil((new Date(battle.endsAt).getTime() - Date.now()) / 1000),
      );
      this.realtime.emitToSocket(socketId, 'timer_tick', {
        battleId,
        remainingTime: remainingSeconds,
        remainingSeconds,
        totalDurationSeconds: battle.durationSeconds,
        paused: false,
        players: battle.players.map((p) => ({
          userId: String(p.userId),
          submitted: !!p.submitted,
        })),
        serverTime: new Date().toISOString(),
      });
    } else if (battle.status === 'finished') {
      this.realtime.emitToSocket(socketId, 'battle_result', this.toResultPayload(battle));
    } else {
      this.realtime.emitToSocket(socketId, 'battle_waiting', {
        battleId,
        challengeId: String(battle.challengeId),
        durationSeconds: battle.durationSeconds,
      });
    }
  }

  private scheduleBattleSchedulers(battleId: string, endsAt: Date): void {
    this.clearBattleSchedulers(battleId);
    const interval = setInterval(() => {
      void this.onTimerTick(battleId);
    }, 1000);
    const delay = Math.max(0, endsAt.getTime() - Date.now());
    const timeout = setTimeout(() => {
      void this.finalizeBattle(battleId, 'timeout');
    }, delay);
    this.schedulers.set(battleId, { interval, timeout });
    void this.onTimerTick(battleId);
  }

  private clearBattleSchedulers(battleId: string): void {
    const t = this.schedulers.get(battleId);
    if (!t) return;
    if (t.interval) clearInterval(t.interval);
    if (t.timeout) clearTimeout(t.timeout);
    this.schedulers.delete(battleId);
  }

  private async onTimerTick(battleId: string): Promise<void> {
    const battle = await this.battleModel.findById(battleId).lean();
    if (!battle || battle.status !== 'active' || !battle.endsAt) {
      this.clearBattleSchedulers(battleId);
      return;
    }
    const remainingSeconds = Math.max(0, Math.ceil((new Date(battle.endsAt).getTime() - Date.now()) / 1000));
    this.realtime.emitToBattleRoom(battleId, 'timer_tick', {
      battleId,
      remainingTime: remainingSeconds,
      remainingSeconds,
      totalDurationSeconds: battle.durationSeconds,
      paused: false,
      players: (battle.players || []).map((p: any) => ({
        userId: String(p.userId),
        submitted: !!p.submitted,
      })),
      serverTime: new Date().toISOString(),
    });
    if (remainingSeconds <= 0) {
      await this.finalizeBattle(battleId, 'timeout');
    }
  }

  async submitCode(
    battleId: string,
    userId: string,
    code: string,
    language: string,
  ): Promise<{ overall: { passed: number; total: number }; executionTimeMs: number; passed: boolean }> {
    const uid = new Types.ObjectId(userId);
    const battle = await this.battleModel.findById(battleId).exec();
    if (!battle || battle.status !== 'active') {
      throw new BadRequestException('Battle is not active');
    }
    if (!battle.endsAt || Date.now() > new Date(battle.endsAt).getTime()) {
      throw new BadRequestException('Battle time is up');
    }

    const player = battle.players.find((p) => p.userId.equals(uid));
    if (!player) throw new ForbiddenException('Not a player in this battle');
    if (player.submitted) throw new BadRequestException('Already submitted');
    if (player.submitAttempts >= MAX_SUBMITS_PER_PLAYER) {
      throw new BadRequestException('Submission limit reached for this battle');
    }

    const inc = await this.battleModel.updateOne(
      {
        _id: battle._id,
        status: 'active',
        players: { $elemMatch: { userId: uid, submitted: false, submitAttempts: { $lt: MAX_SUBMITS_PER_PLAYER } } },
      },
      { $inc: { 'players.$[p].submitAttempts': 1 } },
      { arrayFilters: [{ 'p.userId': uid }] },
    );
    if (inc.modifiedCount === 0) {
      throw new BadRequestException('Cannot submit at this time');
    }

    const challenge = await this.challengeService.getChallengeWithTestCases(String(battle.challengeId));
    if (!challenge.languages?.includes(language as any)) {
      throw new BadRequestException('Language not allowed for this challenge');
    }
    const mappedLang = language === 'cpp' ? 'c++' : language;
    const testCases = (challenge.testCases || []).map((t: { input?: string; expectedOutput?: string }) => ({
      input: t.input ?? '',
      expectedOutput: (t.expectedOutput ?? '').trim(),
    }));
    if (testCases.length === 0) {
      throw new ServiceUnavailableException('Challenge has no test cases');
    }

    const exec = await this.codeExecution.executeCode({ code, language: mappedLang, testCases });
    const totalExecMs = exec.results.reduce((s: number, r: { executionTime?: number }) => s + (r.executionTime || 0), 0);
    const allPass = exec.overall.total > 0 && exec.overall.passed === exec.overall.total;

    const submissionDoc = {
      userId: uid,
      code,
      language,
      result: { overall: exec.overall, results: exec.results } as Record<string, unknown>,
      executionTime: totalExecMs,
      passed: allPass,
      submittedAt: new Date(),
    };

    const pushed = await this.battleModel.findOneAndUpdate(
      {
        _id: battle._id,
        status: 'active',
        players: { $elemMatch: { userId: uid, submitted: false } },
      },
      {
        $push: { submissions: submissionDoc as any },
        $set: {
          'players.$[p].submitted': true,
          'players.$[p].submissionTime': new Date(),
          'players.$[p].passed': allPass,
        },
      },
      { arrayFilters: [{ 'p.userId': uid }], new: true },
    );

    if (!pushed) {
      throw new BadRequestException('Already submitted');
    }

    this.realtime.emitToBattleRoom(battleId, 'opponent_submitted', {
      battleId,
      userId,
      username: player.username,
    });

    const allDone = pushed.players.every((p) => p.submitted);
    if (allDone) {
      await this.finalizeBattle(battleId, 'both_submitted');
    }

    return { overall: exec.overall, executionTimeMs: totalExecMs, passed: allPass };
  }

  async finalizeBattle(battleId: string, reason: string): Promise<void> {
    this.clearBattleSchedulers(battleId);

    const fresh = await this.battleModel.findOne({ _id: battleId, status: 'active' }).exec();
    if (!fresh) return;

    const lastByUser = new Map<string, (typeof fresh.submissions)[0]>();
    for (const s of fresh.submissions) {
      lastByUser.set(String(s.userId), s);
    }

    const n = fresh.players.length;
    const outcomes = fresh.players.map((p, i) => {
      const sub = lastByUser.get(String(p.userId));
      const overall = (sub?.result as { overall?: { passed: number; total: number } })?.overall;
      const teamIndex =
        typeof (p as any).teamIndex === 'number' ? (p as any).teamIndex : inferTeamIndexFromPosition(i, n);
      return {
        userId: p.userId,
        teamIndex,
        submitted: p.submitted,
        passed: p.passed,
        submissionTime: p.submissionTime,
        executionTimeMs: sub?.executionTime,
        testsPassed: overall?.passed,
        testsTotal: overall?.total,
      };
    });

    const format = (fresh.mode || '1v1') as BattleFormat;
    const { winnerUserId, winnerTeamIndex, draw, scoredPlayers } = resolveBattleOutcome(outcomes, format);
    const scoreByUser = new Map(scoredPlayers.map((s) => [s.userId, s]));

    const updated = await this.battleModel
      .findOneAndUpdate(
        { _id: battleId, status: 'active' },
        {
          $set: {
            status: 'finished',
            finishReason: reason,
            winnerId: winnerUserId ? new Types.ObjectId(winnerUserId) : null,
            winnerTeamIndex: winnerTeamIndex !== null && winnerTeamIndex !== undefined ? winnerTeamIndex : null,
            draw,
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) return;

    for (const p of updated.players as any[]) {
      const score = scoreByUser.get(String(p.userId));
      p.scoreBreakdown = score
        ? {
            passScore: score.passScore,
            submissionSpeedScore: score.submissionSpeedScore,
            executionEfficiencyScore: score.executionEfficiencyScore,
            bonusScore: score.bonusScore,
            totalScore: score.totalScore,
          }
        : {
            passScore: 0,
            submissionSpeedScore: 0,
            executionEfficiencyScore: 0,
            bonusScore: 0,
            totalScore: 0,
          };
    }
    await updated.save();

    this.notifyBattleResult(updated);

    this.realtime.emitToBattleRoom(battleId, 'battle_result', this.toResultPayload(updated));
  }

  async forfeitBattle(battleId: string, userId: string): Promise<void> {
    const uid = new Types.ObjectId(userId);
    const battle = await this.battleModel.findById(battleId).exec();
    if (!battle || battle.status === 'finished') return;
    const me = battle.players.find((p) => p.userId.equals(uid));
    if (!me) throw new ForbiddenException('Not a player in this battle');

    const myIdx = battle.players.findIndex((p) => p.userId.equals(uid));
    const myTeam =
      typeof (me as any).teamIndex === 'number'
        ? (me as any).teamIndex
        : inferTeamIndexFromPosition(myIdx, battle.players.length);
    const winners = battle.players.filter((p, i) => {
      const ti =
        typeof (p as any).teamIndex === 'number'
          ? (p as any).teamIndex
          : inferTeamIndexFromPosition(i, battle.players.length);
      return ti !== myTeam;
    });
    if (!winners.length) return;

    this.clearBattleSchedulers(battleId);

    const res = await this.battleModel
      .findOneAndUpdate(
        { _id: battleId, status: { $in: ['waiting', 'active'] } },
        {
          $set: {
            status: 'finished',
            finishReason: 'forfeit',
            winnerId: winners[0].userId,
            winnerTeamIndex: myTeam === 0 ? 1 : 0,
            draw: false,
          },
        },
        { new: true },
      )
      .exec();

    if (res) {
      this.notifyBattleResult(res);
      this.realtime.emitToBattleRoom(battleId, 'battle_result', this.toResultPayload(res));
    }
  }

  toPendingSnapshot(battle: BattleDocument) {
    return {
      battleId: String(battle._id),
      status: battle.status,
      challengeId: String(battle.challengeId),
      durationSeconds: battle.durationSeconds,
      startedAt: battle.startedAt?.toISOString() ?? null,
      endsAt: battle.endsAt?.toISOString() ?? null,
    };
  }

  toResultPayload(battle: BattleDocument) {
    const usernameByUserId = new Map(battle.players.map((p) => [String(p.userId), p.username]));
    const n = battle.players.length;
    return {
      battleId: String(battle._id),
      mode: battle.mode,
      status: battle.status,
      winnerId: battle.winnerId ? String(battle.winnerId) : null,
      winnerTeamIndex:
        typeof (battle as any).winnerTeamIndex === 'number' ? (battle as any).winnerTeamIndex : null,
      draw: battle.draw,
      finishReason: battle.finishReason,
      challengeId: String(battle.challengeId),
      startedAt: battle.startedAt?.toISOString() ?? null,
      endsAt: battle.endsAt?.toISOString() ?? null,
      finishedAt: (battle as any).updatedAt ? new Date((battle as any).updatedAt).toISOString() : null,
      teams: this.teamRosterFromBattle(battle),
      players: battle.players.map((p, i) => ({
        userId: String(p.userId),
        username: p.username,
        teamIndex:
          typeof (p as any).teamIndex === 'number'
            ? (p as any).teamIndex
            : inferTeamIndexFromPosition(i, n),
        submitted: p.submitted,
        passed: p.passed,
        submissionTime: p.submissionTime?.toISOString() ?? null,
        scoreBreakdown: p.scoreBreakdown || {
          passScore: 0,
          submissionSpeedScore: 0,
          executionEfficiencyScore: 0,
          bonusScore: 0,
          totalScore: 0,
        },
      })),
      submissions: battle.submissions.map((s) => ({
        userId: String(s.userId),
        username: usernameByUserId.get(String(s.userId)) ?? 'user',
        language: s.language,
        passed: s.passed,
        executionTimeMs: s.executionTime,
        submittedAt: s.submittedAt?.toISOString(),
        overall: (s.result as { overall?: unknown })?.overall ?? null,
      })),
      scoreWeights: battle.scoreWeights || {
        passedAllTests: 50,
        submissionSpeed: 25,
        executionEfficiency: 15,
        bonus: 10,
      },
    };
  }

  async getPendingBattleForUser(userId: string): Promise<BattleDocument | null> {
    const uid = new Types.ObjectId(userId);
    return this.battleModel
      .findOne({
        status: { $in: ['waiting', 'active'] },
        players: { $elemMatch: { userId: uid } },
      })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async getSummaryForPlayer(battleId: string, userId: string) {
    const uid = new Types.ObjectId(userId);
    const battle = await this.battleModel.findById(battleId).exec();
    if (!battle) return null;
    const isPlayer = battle.players.some((p) => p.userId.equals(uid));
    if (!isPlayer) return null;
    return this.toResultPayload(battle);
  }
}
