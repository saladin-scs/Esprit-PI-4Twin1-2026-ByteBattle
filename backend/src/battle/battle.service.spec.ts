import { Types } from 'mongoose';
import { BattleService } from './battle.service';
import { BattleRealtimeService } from './battle-realtime.service';
import { ChallengeService } from '../challenges/challenges.service';
import { CodeExecutionService } from '../code-execution/code-execution.service';
import { getModelToken } from '@nestjs/mongoose';
import { Battle } from './schemas/battle.schema';
import { Test } from '@nestjs/testing';

describe('BattleService', () => {
  const realtime = {
    attachServer: jest.fn(),
    emitToBattleRoom: jest.fn(),
    emitToUser: jest.fn(),
    emitToSocket: jest.fn(),
    joinBattleRoom: jest.fn(),
    leaveBattleRoom: jest.fn(),
    replaceUserSocket: jest.fn(),
    unregisterSocket: jest.fn(),
  };
  const challengeService = {
    pickRandomPublishedChallengeForBattle: jest.fn(),
    getChallengeWithTestCases: jest.fn(),
    findOne: jest.fn(),
  };
  const codeExecution = {
    executeCode: jest.fn(),
  };

  const battleId = new Types.ObjectId();
  const challengeId = new Types.ObjectId();
  const u1 = new Types.ObjectId();
  const u2 = new Types.ObjectId();

  const activeBattle = {
    _id: battleId,
    challengeId,
    status: 'active' as const,
    durationSeconds: 600,
    startedAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 600_000),
    players: [
      {
        userId: u1,
        username: 'a',
        isReady: true,
        submitted: false,
        submissionTime: null,
        submitAttempts: 0,
      },
      {
        userId: u2,
        username: 'b',
        isReady: true,
        submitted: false,
        submissionTime: null,
        submitAttempts: 0,
      },
    ],
    submissions: [],
  };

  const mockModel = {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    updateOne: jest.fn(),
  };

  let service: BattleService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockModel.findById.mockReturnValue({ exec: jest.fn().mockResolvedValue({ ...activeBattle }) });
    mockModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const moduleRef = await Test.createTestingModule({
      providers: [
        BattleService,
        { provide: getModelToken(Battle.name), useValue: mockModel },
        { provide: ChallengeService, useValue: challengeService },
        { provide: CodeExecutionService, useValue: codeExecution },
        { provide: BattleRealtimeService, useValue: realtime },
      ],
    }).compile();

    service = moduleRef.get(BattleService);
  });

  it('submitCode runs tests and emits opponent_submitted', async () => {
    challengeService.getChallengeWithTestCases.mockResolvedValue({
      languages: ['python'],
      testCases: [{ input: '1 2', expectedOutput: '3' }],
    });
    codeExecution.executeCode.mockResolvedValue({
      results: [{ passed: true, executionTime: 12 }],
      overall: { passed: 1, total: 1 },
    });
    const pushed = {
      ...activeBattle,
      players: activeBattle.players.map((p) =>
        p.userId.equals(u1) ? { ...p, submitted: true, passed: true } : { ...p },
      ),
      submissions: [{ userId: u1 }],
    };
    mockModel.findOneAndUpdate.mockResolvedValue(pushed);

    const out = await service.submitCode(String(battleId), String(u1), 'print(3)', 'python');
    expect(out.passed).toBe(true);
    expect(out.overall.total).toBe(1);
    expect(realtime.emitToBattleRoom).toHaveBeenCalledWith(
      String(battleId),
      'opponent_submitted',
      expect.objectContaining({ userId: String(u1) }),
    );
  });
});
