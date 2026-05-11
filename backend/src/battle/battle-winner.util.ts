import { Types } from 'mongoose';

export type BattleFormat = '1v1' | '2v2' | '3v3' | '4v4' | '5v5';

export type BattlePlayerOutcome = {
  userId: Types.ObjectId | string;
  submitted: boolean;
  passed?: boolean;
  submissionTime?: Date | null;
  executionTimeMs?: number;
  testsPassed?: number;
  testsTotal?: number;
  bonusScore?: number;
  teamIndex: number;
};

type ScoredInternal = {
  userId: string;
  teamIndex: number;
  passScore: number;
  submissionSpeedScore: number;
  executionEfficiencyScore: number;
  bonusScore: number;
  totalScore: number;
};

export type ScoredPlayerRow = {
  userId: string;
  passScore: number;
  submissionSpeedScore: number;
  executionEfficiencyScore: number;
  bonusScore: number;
  totalScore: number;
};

function scoreSubmittedPlayers(players: BattlePlayerOutcome[]): ScoredInternal[] {
  const norm = players.map((p) => ({
    userId: String(p.userId),
    teamIndex: p.teamIndex,
    submitted: !!p.submitted,
    passed: !!p.passed,
    submissionMs: p.submissionTime ? new Date(p.submissionTime).getTime() : Number.POSITIVE_INFINITY,
    executionMs: typeof p.executionTimeMs === 'number' ? p.executionTimeMs : Number.POSITIVE_INFINITY,
    testsPassed: typeof p.testsPassed === 'number' ? p.testsPassed : 0,
    testsTotal: typeof p.testsTotal === 'number' ? p.testsTotal : 0,
    bonusScore: typeof p.bonusScore === 'number' ? p.bonusScore : 0,
  }));

  const submitted = norm.filter((p) => p.submitted);
  if (submitted.length === 0) {
    return players.map((p) => ({
      userId: String(p.userId),
      teamIndex: p.teamIndex,
      passScore: 0,
      submissionSpeedScore: 0,
      executionEfficiencyScore: 0,
      bonusScore: 0,
      totalScore: 0,
    }));
  }

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

  const byUser = new Map<string, ScoredInternal>();
  for (const p of submitted) {
    const passScore = p.passed ? 50 : 0;
    const submissionSpeedScore = normalizeReverse(p.submissionMs, minSubmitMs, maxSubmitMs) * 25;
    const executionEfficiencyScore = normalizeReverse(p.executionMs, minExecMs, maxExecMs) * 15;
    const bonusScore = normalizeForward(p.bonusScore, minBonus, maxBonus) * 10;
    const totalScore = passScore + submissionSpeedScore + executionEfficiencyScore + bonusScore;
    byUser.set(p.userId, {
      userId: p.userId,
      teamIndex: p.teamIndex,
      passScore,
      submissionSpeedScore,
      executionEfficiencyScore,
      bonusScore,
      totalScore,
    });
  }

  return players.map((p) => {
    const uid = String(p.userId);
    const s = byUser.get(uid);
    if (s) return s;
    return {
      userId: uid,
      teamIndex: p.teamIndex,
      passScore: 0,
      submissionSpeedScore: 0,
      executionEfficiencyScore: 0,
      bonusScore: 0,
      totalScore: 0,
    };
  });
}

/** Infer team index from lobby order when missing (legacy documents). */
export function inferTeamIndexFromPosition(playerIndex: number, playerCount: number): number {
  if (playerCount <= 0) return 0;
  if (playerCount === 2) return playerIndex;
  const half = playerCount / 2;
  return playerIndex < half ? 0 : 1;
}

export function resolveBattleOutcome(
  players: BattlePlayerOutcome[],
  format: BattleFormat,
): {
  winnerUserId: string | null;
  winnerTeamIndex: number | null;
  draw: boolean;
  scoredPlayers: ScoredPlayerRow[];
} {
  const scored = scoreSubmittedPlayers(players);
  const rows: ScoredPlayerRow[] = scored.map((s) => ({
    userId: s.userId,
    passScore: Number(s.passScore.toFixed(3)),
    submissionSpeedScore: Number(s.submissionSpeedScore.toFixed(3)),
    executionEfficiencyScore: Number(s.executionEfficiencyScore.toFixed(3)),
    bonusScore: Number(s.bonusScore.toFixed(3)),
    totalScore: Number(s.totalScore.toFixed(3)),
  }));

  const teamTotals = [0, 1].map((ti) =>
    scored.filter((s) => s.teamIndex === ti).reduce((sum, s) => sum + s.totalScore, 0),
  );

  if (format === '2v2' || format === '3v3' || format === '4v4' || format === '5v5') {
    const a = teamTotals[0];
    const b = teamTotals[1];
    if (Math.abs(a - b) < 1e-9) {
      return { winnerUserId: null, winnerTeamIndex: null, draw: true, scoredPlayers: rows };
    }
    const winTeam = a > b ? 0 : 1;
    return { winnerUserId: null, winnerTeamIndex: winTeam, draw: false, scoredPlayers: rows };
  }

  // 1v1 — legacy ordering on submitted players (weighted score + same tie-breakers as before)
  const submittedPlayers = players.filter((p) => p.submitted);
  if (submittedPlayers.length === 0) {
    return { winnerUserId: null, winnerTeamIndex: null, draw: true, scoredPlayers: rows };
  }

  const rowByUser = new Map(rows.map((r) => [r.userId, r]));
  type SortRow = ScoredPlayerRow & {
    _tiePassed: number;
    _tieTotal: number;
    _tieExec: number;
    _tieSubmit: number;
  };
  const sortable: SortRow[] = submittedPlayers.map((p) => {
    const r = rowByUser.get(String(p.userId))!;
    return {
      ...r,
      _tiePassed: p.testsPassed ?? 0,
      _tieTotal: p.testsTotal ?? 0,
      _tieExec: typeof p.executionTimeMs === 'number' ? p.executionTimeMs : Number.POSITIVE_INFINITY,
      _tieSubmit: p.submissionTime ? new Date(p.submissionTime).getTime() : Number.POSITIVE_INFINITY,
    };
  });

  sortable.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aRatio = a._tieTotal > 0 ? a._tiePassed / a._tieTotal : 0;
    const bRatio = b._tieTotal > 0 ? b._tiePassed / b._tieTotal : 0;
    if (bRatio !== aRatio) return bRatio - aRatio;
    if (a._tieExec !== b._tieExec) return a._tieExec - b._tieExec;
    return a._tieSubmit - b._tieSubmit;
  });

  const best = sortable[0];
  const second = sortable[1];
  const draw =
    !!second &&
    best.totalScore === second.totalScore &&
    (best._tieTotal > 0 ? best._tiePassed / best._tieTotal : 0) ===
      (second._tieTotal > 0 ? second._tiePassed / second._tieTotal : 0) &&
    best._tieExec === second._tieExec &&
    best._tieSubmit === second._tieSubmit;

  if (draw) {
    return { winnerUserId: null, winnerTeamIndex: null, draw: true, scoredPlayers: rows };
  }

  const winnerP = players.find((x) => String(x.userId) === best.userId);
  return {
    winnerUserId: best.userId,
    winnerTeamIndex: winnerP?.teamIndex ?? 0,
    draw: false,
    scoredPlayers: rows,
  };
}

/** @deprecated Use resolveBattleOutcome — kept for unit tests compatibility */
export function computeBattleWinner(
  players: Array<Omit<BattlePlayerOutcome, 'teamIndex'> & { teamIndex?: number }>,
): {
  winnerId: string | null;
  draw: boolean;
  scoredPlayers: ScoredPlayerRow[];
} {
  const withTeams: BattlePlayerOutcome[] = players.map((p, i) => ({
    ...p,
    teamIndex: typeof p.teamIndex === 'number' ? p.teamIndex : inferTeamIndexFromPosition(i, players.length),
  }));
  const r = resolveBattleOutcome(withTeams, '1v1');
  return {
    winnerId: r.winnerUserId,
    draw: r.draw,
    scoredPlayers: r.scoredPlayers,
  };
}
