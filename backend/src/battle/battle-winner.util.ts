import { Types } from 'mongoose';

export type BattlePlayerOutcome = {
  userId: Types.ObjectId | string;
  submitted: boolean;
  passed?: boolean;
  submissionTime?: Date | null;
  executionTimeMs?: number;
  testsPassed?: number;
  testsTotal?: number;
  bonusScore?: number;
};

type NormalizedScored = {
  userId: string;
  submitted: boolean;
  passed: boolean;
  submissionMs: number;
  executionMs: number;
  testsPassed: number;
  testsTotal: number;
  bonusScore: number;
};

export function computeBattleWinner(players: BattlePlayerOutcome[]): {
  winnerId: string | null;
  draw: boolean;
  scoredPlayers: Array<{
    userId: string;
    passScore: number;
    submissionSpeedScore: number;
    executionEfficiencyScore: number;
    bonusScore: number;
    totalScore: number;
  }>;
} {
  if (!players?.length) return { winnerId: null, draw: true, scoredPlayers: [] };

  const norm: NormalizedScored[] = players.map((p) => ({
    userId: String(p.userId),
    submitted: !!p.submitted,
    passed: !!p.passed,
    submissionMs: p.submissionTime ? new Date(p.submissionTime).getTime() : Number.POSITIVE_INFINITY,
    executionMs: typeof p.executionTimeMs === 'number' ? p.executionTimeMs : Number.POSITIVE_INFINITY,
    testsPassed: typeof p.testsPassed === 'number' ? p.testsPassed : 0,
    testsTotal: typeof p.testsTotal === 'number' ? p.testsTotal : 0,
    bonusScore: typeof p.bonusScore === 'number' ? p.bonusScore : 0,
  }));

  const submitted = norm.filter((p) => p.submitted);
  if (submitted.length === 0) return { winnerId: null, draw: true, scoredPlayers: [] };

  const minSubmitMs = Math.min(...submitted.map((s) => s.submissionMs));
  const maxSubmitMs = Math.max(...submitted.map((s) => s.submissionMs));
  const minExecMs = Math.min(...submitted.map((s) => s.executionMs));
  const maxExecMs = Math.max(...submitted.map((s) => s.executionMs));
  const minBonus = Math.min(...submitted.map((s) => s.bonusScore));
  const maxBonus = Math.max(...submitted.map((s) => s.bonusScore));

  const normalizeReverse = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return 0;
    if (max <= min) return 1;
    return Math.max(0, Math.min(1, (max - value) / (max - min)));
  };
  const normalizeForward = (value: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return 0;
    if (max <= min) return 1;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  };

  const scoredPlayers = submitted.map((p) => {
    const passScore = p.passed ? 50 : 0;
    const submissionSpeedScore = normalizeReverse(p.submissionMs, minSubmitMs, maxSubmitMs) * 25;
    const executionEfficiencyScore = normalizeReverse(p.executionMs, minExecMs, maxExecMs) * 15;
    const bonusScore = normalizeForward(p.bonusScore, minBonus, maxBonus) * 10;
    const totalScore = passScore + submissionSpeedScore + executionEfficiencyScore + bonusScore;
    return {
      userId: p.userId,
      passScore,
      submissionSpeedScore,
      executionEfficiencyScore,
      bonusScore,
      totalScore,
      _tiePassed: p.testsPassed,
      _tieTotal: p.testsTotal,
      _tieExec: p.executionMs,
      _tieSubmit: p.submissionMs,
    };
  });

  scoredPlayers.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aRatio = a._tieTotal > 0 ? a._tiePassed / a._tieTotal : 0;
    const bRatio = b._tieTotal > 0 ? b._tiePassed / b._tieTotal : 0;
    if (bRatio !== aRatio) return bRatio - aRatio;
    if (a._tieExec !== b._tieExec) return a._tieExec - b._tieExec;
    return a._tieSubmit - b._tieSubmit;
  });

  const best = scoredPlayers[0];
  const second = scoredPlayers[1];
  const draw =
    !!second &&
    best.totalScore === second.totalScore &&
    (best._tieTotal > 0 ? best._tiePassed / best._tieTotal : 0) ===
      (second._tieTotal > 0 ? second._tiePassed / second._tieTotal : 0) &&
    best._tieExec === second._tieExec &&
    best._tieSubmit === second._tieSubmit;

  return {
    winnerId: draw ? null : best.userId,
    draw,
    scoredPlayers: scoredPlayers.map((p) => ({
      userId: p.userId,
      passScore: Number(p.passScore.toFixed(3)),
      submissionSpeedScore: Number(p.submissionSpeedScore.toFixed(3)),
      executionEfficiencyScore: Number(p.executionEfficiencyScore.toFixed(3)),
      bonusScore: Number(p.bonusScore.toFixed(3)),
      totalScore: Number(p.totalScore.toFixed(3)),
    })),
  };
}
