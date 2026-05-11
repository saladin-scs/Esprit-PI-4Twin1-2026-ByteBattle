import { useEffect, useState } from 'react';
import { challengesApi, type RecommendedChallengeItem } from '../services/api';

export function useRecommendations(userId: string | null | undefined, limit = 8) {
  const [recommendations, setRecommendations] = useState<RecommendedChallengeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setRecommendations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    challengesApi
      .getRecommendations(userId, { limit })
      .then((response) => {
        if (!active) return;
        setRecommendations(response.data.challenges || []);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message ?? 'Unable to load recommendations');
        setRecommendations([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [userId, limit]);

  return { recommendations, loading, error };
}
