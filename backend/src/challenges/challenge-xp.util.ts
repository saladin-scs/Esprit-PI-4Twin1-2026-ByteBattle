/** After this duration (ms), time XP multiplier reaches its floor. */
export const CHALLENGE_TIME_DECAY_MS = 90 * 60 * 1000;

/** Minimum fraction of XP kept from time decay (linear). */
export const CHALLENGE_TIME_MIN_MULTIPLIER = 0.35;

/**
 * Linear decay: multiplier 1 at t=0, down to CHALLENGE_TIME_MIN_MULTIPLIER at t>=CHALLENGE_TIME_DECAY_MS.
 */
export function timeXpMultiplier(elapsedMs: number): number {
  const min = CHALLENGE_TIME_MIN_MULTIPLIER;
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return 1;
  const r = Math.min(1, elapsedMs / CHALLENGE_TIME_DECAY_MS);
  return Math.max(min, 1 - r * (1 - min));
}

export function sumHintCosts(
  hints: Array<{ cost?: number }> | undefined,
  indices: number[],
  defaultCostIfMissing = 10,
): number {
  if (!indices.length) return 0;
  let sum = 0;
  for (const i of indices) {
    if (i < 0 || !hints || i >= hints.length) continue;
    const c = hints[i]?.cost;
    sum += typeof c === 'number' && c >= 0 ? c : defaultCostIfMissing;
  }
  return sum;
}
