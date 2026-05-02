import { Types } from 'mongoose';
import { computeBattleWinner } from './battle-winner.util';

describe('computeBattleWinner', () => {
  const a = new Types.ObjectId('507f1f77bcf86cd799439011');
  const b = new Types.ObjectId('507f191e810c19729de860ea');

  it('prioritizes full pass by weighted score', () => {
    const r = computeBattleWinner([
      { userId: a, submitted: true, passed: true, submissionTime: new Date('2020-01-01T00:00:01Z') },
      { userId: b, submitted: true, passed: false, submissionTime: new Date('2020-01-01T00:00:00Z') },
    ]);
    expect(r.draw).toBe(false);
    expect(r.winnerId).toBe(String(a));
    expect(r.scoredPlayers.length).toBe(2);
  });

  it('earlier submission wins when both pass', () => {
    const r = computeBattleWinner([
      { userId: a, submitted: true, passed: true, submissionTime: new Date('2020-01-01T00:00:02Z') },
      { userId: b, submitted: true, passed: true, submissionTime: new Date('2020-01-01T00:00:01Z') },
    ]);
    expect(r.winnerId).toBe(String(b));
  });

  it('draw when fully tied on weighted+tie-break criteria', () => {
    const t = new Date('2020-01-01T00:00:00Z');
    const r = computeBattleWinner([
      { userId: a, submitted: true, passed: true, submissionTime: t, executionTimeMs: 20, testsPassed: 4, testsTotal: 4 },
      { userId: b, submitted: true, passed: true, submissionTime: t, executionTimeMs: 20, testsPassed: 4, testsTotal: 4 },
    ]);
    expect(r.draw).toBe(true);
  });

  it('uses weighted + ratio tie-break when nobody fully passes', () => {
    const r = computeBattleWinner([
      {
        userId: a,
        submitted: true,
        passed: false,
        submissionTime: new Date('2020-01-01T00:00:00Z'),
        testsPassed: 1,
        testsTotal: 4,
        executionTimeMs: 10,
      },
      {
        userId: b,
        submitted: true,
        passed: false,
        submissionTime: new Date('2020-01-01T00:00:01Z'),
        testsPassed: 3,
        testsTotal: 4,
        executionTimeMs: 5,
      },
    ]);
    expect(r.winnerId).toBe(String(a));
  });
});
