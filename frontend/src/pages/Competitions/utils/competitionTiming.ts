/**
 * Libellés relatifs pour la liste / fiche compétition (fuseau local).
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
    if (d >= 1) return `Commence dans ${d} jour${d > 1 ? 's' : ''}`;
    if (h >= 1) return `Commence dans ${h} h`;
    const m = Math.max(1, Math.ceil(diff / 60_000));
    return `Commence dans ${m} min`;
  }

  if (!finished && now >= start && now < end) {
    const untilEnd = end - now;
    if (untilEnd <= 0) return null;
    const h = Math.floor(untilEnd / 3_600_000);
    if (h < 1) return `Se termine dans ${Math.max(1, Math.ceil(untilEnd / 60_000))} min`;
    if (untilEnd <= 72 * 3_600_000) return `Se termine dans ${h} h`;
    const days = Math.round(untilEnd / 86_400_000);
    if (days <= 7) return `Se termine dans ${days} jour${days > 1 ? 's' : ''}`;
  }

  return null;
}
