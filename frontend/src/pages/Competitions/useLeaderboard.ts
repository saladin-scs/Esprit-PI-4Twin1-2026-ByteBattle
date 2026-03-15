import { useState, useEffect, useCallback } from 'react';
import { competitionsApi } from '../../services/api';
import type { LeaderboardEntry } from './types';

const POLL_INTERVAL_MS = 5000;

export function useLeaderboard(
  competitionId: string | undefined,
  status: string | undefined,
  languageFilter: string
) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeaderboard = useCallback(() => {
    if (!competitionId) return;
    setLoading(true);
    competitionsApi
      .getLeaderboard(competitionId, { limit: 50, language: languageFilter || undefined })
      .then((res: { data: { entries?: LeaderboardEntry[] } }) => {
        setEntries(res.data?.entries ?? []);
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, [competitionId, languageFilter]);

  useEffect(() => {
    if (!competitionId) {
      setEntries([]);
      setLoading(false);
      return;
    }
    fetchLeaderboard();
    const isActive = status === 'active';
    const interval = isActive ? setInterval(fetchLeaderboard, POLL_INTERVAL_MS) : undefined;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [competitionId, status, fetchLeaderboard]);

  return { entries, loading, refetch: fetchLeaderboard };
}
