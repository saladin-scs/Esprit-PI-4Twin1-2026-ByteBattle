/**
 * Relative labels for competition list/detail views (local timezone).
 */
export function getCompetitionTimeHint(
  startIso: string,
  endIso: string,
  status: string,
): string | null {
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const finished = status === 'closed' || status === 'archived';

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;

  if (!finished && now < start) {
    const diff = start - now;
    const h = Math.floor(diff / 3_600_000);
    const d = Math.floor(h / 24);
    if (d >= 1) return `Starts in ${d} day${d > 1 ? 's' : ''}`;
    if (h >= 1) return `Starts in ${h} h`;
    const m = Math.max(1, Math.ceil(diff / 60_000));
    return `Starts in ${m} min`;
  }

  if (!finished && now >= start && now < end) {
    const untilEnd = end - now;
    if (untilEnd <= 0) return null;
    const h = Math.floor(untilEnd / 3_600_000);
    if (h < 1) return `Ends in ${Math.max(1, Math.ceil(untilEnd / 60_000))} min`;
    if (untilEnd <= 72 * 3_600_000) return `Ends in ${h} h`;
    const days = Math.round(untilEnd / 86_400_000);
    if (days <= 7) return `Ends in ${days} day${days > 1 ? 's' : ''}`;
  }

  return null;
}
