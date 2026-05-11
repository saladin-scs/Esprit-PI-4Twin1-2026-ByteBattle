// Lightweight client-side adapter to map raw AI recommendation items to local challenge objects.
type ChallengeIndexItem = {
  _id: string;
  title: string;
  tags?: string[];
  difficulty?: string;
};

type RawRec = {
  challenge_id?: string;
  challenge_name?: string;
  title?: string;
  score?: number;
  difficulty?: string;
  reason?: string;
};

type SubmissionRow = {
  challengeId?: { _id: string; title: string; difficulty: string; tags?: string[] } | string;
  status?: string;
};

function normalize(s: string) {
  return String(s || '').toLowerCase().trim();
}

function looksLikeObjectId(s: string) {
  return typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);
}

export function findBestMatch(candidate: string, challenges: ChallengeIndexItem[] | null) {
  if (!candidate || !challenges || !challenges.length) return null;
  const c = normalize(candidate);

  // Try by id
  if (looksLikeObjectId(candidate)) {
    const byId = challenges.find((ch) => String(ch._id) === candidate);
    if (byId) return byId;
  }

  // Exact title match
  const exact = challenges.find((ch) => normalize(ch.title) === c);
  if (exact) return exact;

  // Substring
  const substr = challenges.find((ch) => normalize(ch.title).includes(c));
  if (substr) return substr;

  // Tokenized in-order regex: require all tokens appear in order
  const tokens = c.split(/\s+/).filter(Boolean).slice(0, 6);
  if (tokens.length) {
    const pattern = tokens.join('.*');
    const regex = new RegExp(pattern, 'i');
    const tokenMatch = challenges.find((ch) => regex.test(ch.title));
    if (tokenMatch) return tokenMatch;
  }

  // Tag match
  const tagMatch = challenges.find((ch) => (ch.tags || []).map(normalize).includes(c));
  if (tagMatch) return tagMatch;

  // Fallback scoring: count how many tokens appear in title+tags
  let best: ChallengeIndexItem | null = null;
  let bestScore = 0;
  for (const ch of challenges) {
    const hay = (normalize(ch.title) + ' ' + ((ch.tags || []).join(' ') || '')).toLowerCase();
    let score = 0;
    for (const t of c.split(/\s+/).filter(Boolean)) if (hay.indexOf(t) !== -1) score++;
    if (score > bestScore) {
      bestScore = score;
      best = ch;
    }
  }
  return bestScore > 0 ? best : null;
}

export function mapRawRecommendations(
  raw: RawRec[],
  challenges: ChallengeIndexItem[],
  count: number = 5,
) {
  const mapped: Array<{ challengeId: string; challengeName: string; score: number | null; difficulty?: string; reason?: string }> = [];
  const seen = new Set<string>();

  for (const r of raw || []) {
    const candidate = String(r.challenge_id || r.challenge_name || r.title || '').trim();
    if (!candidate) continue;
    const found = findBestMatch(candidate, challenges);
    if (found && !seen.has(found._id)) {
      mapped.push({
        challengeId: String(found._id),
        challengeName: found.title,
        score: r.score ?? null,
        difficulty: found.difficulty || r.difficulty,
        reason: r.reason || 'Mapped client-side',
      });
      seen.add(found._id);
      if (mapped.length >= count) break;
    }
  }

  // Fill with fallbacks from challenges list if needed
  if (mapped.length < count) {
    for (const ch of challenges) {
      if (mapped.length >= count) break;
      if (seen.has(ch._id)) continue;
      mapped.push({ challengeId: ch._id, challengeName: ch.title, score: null, difficulty: ch.difficulty, reason: 'Fallback: index' });
      seen.add(ch._id);
    }
  }

  return mapped;
}

export function buildLocalRecommendations(
  challenges: ChallengeIndexItem[],
  submissions: SubmissionRow[] | null,
  count: number = 8,
) {
  const accepted = (submissions || []).filter((row) => row.status === 'accepted');
  const solvedIds = new Set<string>();
  const preferredTags = new Map<string, number>();
  const preferredDifficulties = new Map<string, number>();

  for (const row of accepted) {
    const challenge = typeof row.challengeId === 'object' ? row.challengeId : null;
    if (!challenge) continue;
    solvedIds.add(challenge._id);
    preferredDifficulties.set(challenge.difficulty, (preferredDifficulties.get(challenge.difficulty) || 0) + 1);
    for (const tag of challenge.tags || []) {
      const key = normalize(tag);
      preferredTags.set(key, (preferredTags.get(key) || 0) + 1);
    }
  }

  const preferredDifficulty = [...preferredDifficulties.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const preferredTagList = [...preferredTags.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag).slice(0, 6);

  const scored = challenges
    .filter((challenge) => !solvedIds.has(challenge._id))
    .map((challenge) => {
      let score = 0;
      const title = normalize(challenge.title);
      const tags = (challenge.tags || []).map(normalize);

      // Prefer the user's dominant difficulty, but avoid only easy picks.
      if (preferredDifficulty && challenge.difficulty?.toLowerCase() === preferredDifficulty.toLowerCase()) score += 4;
      if (challenge.difficulty?.toLowerCase() === 'medium') score += 2;
      if (challenge.difficulty?.toLowerCase() === 'easy') score += 1;

      // Tag overlap with solved history.
      for (const tag of preferredTagList) {
        if (tags.includes(tag) || title.includes(tag)) score += 3;
      }

      // General freshness/variety boost for titles that look distinct from solved set.
      if (challenge.isNew) score += 1;

      return {
        challengeId: challenge._id,
        challengeName: challenge.title,
        score,
        difficulty: challenge.difficulty,
        reason: preferredDifficulty
          ? `Matched your ${preferredDifficulty} focus and solved tags`
          : 'Matched your challenge history',
      };
    })
    .sort((a, b) => b.score - a.score || a.challengeName.localeCompare(b.challengeName));

  const top = scored.slice(0, count);

  if (top.length >= count) return top;

  const seen = new Set(top.map((item) => item.challengeId));
  for (const challenge of challenges) {
    if (top.length >= count) break;
    if (seen.has(challenge._id) || solvedIds.has(challenge._id)) continue;
    top.push({
      challengeId: challenge._id,
      challengeName: challenge.title,
      score: null,
      difficulty: challenge.difficulty,
      reason: 'Fallback: challenge index',
    });
    seen.add(challenge._id);
  }

  return top;
}

export default { findBestMatch, mapRawRecommendations, buildLocalRecommendations };
