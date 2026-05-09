import { useState, useCallback } from 'react';
import mlAPI from '../services/mlAPI';

/**
 * Hook for performance predictions
 */
export const usePerformancePrediction = () => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const predict = useCallback(async (userId: string, challengeId: string, userFeatures: any, challengeFeatures: any) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mlAPI.prediction.predictPerformance(
        userId,
        challengeId,
        userFeatures,
        challengeFeatures,
      );
      setPrediction(result.data);
      return result.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to get prediction';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { prediction, loading, error, predict };
};

/**
 * Hook for challenge recommendations
 */
export const useRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(
    async (userId: string, count: number = 5, difficulty?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await mlAPI.recommendation.getChallengeRecommendations(
          userId,
          count,
          difficulty,
        );
        setRecommendations(result.data.recommendations || []);
        return result.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to get recommendations';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { recommendations, loading, error, getRecommendations };
};

/**
 * Hook for matchmaking
 */
export const useMatchmaking = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findOpponents = useCallback(
    async (userId: string, userFeatures: any, availableUsers: string[], count: number = 3) => {
      setLoading(true);
      setError(null);
      try {
        const result = await mlAPI.matchmaking.getMatchupSuggestions(
          userId,
          userFeatures,
          availableUsers,
          count,
        );
        setSuggestions(result.data.suggestions || []);
        return result.data;
      } catch (err: any) {
        const errorMsg = err.response?.data?.message || 'Failed to find opponents';
        setError(errorMsg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { suggestions, loading, error, findOpponents };
};

/**
 * Hook for user analytics
 */
export const useUserAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (userId: string, daysPeriod: number = 30) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mlAPI.analytics.getUserAnalytics(userId, daysPeriod);
      setAnalytics(result.data);
      return result.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to get analytics';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analytics, loading, error, fetchAnalytics };
};

/**
 * Hook for leaderboard stats
 */
export const useLeaderboardStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await mlAPI.analytics.getLeaderboardStats();
      setStats(result.data);
      return result.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to get leaderboard stats';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { stats, loading, error, fetchStats };
};

/**
 * Hook for similar users
 */
export const useSimilarUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSimilarUsers = useCallback(async (userId: string, count: number = 5) => {
    setLoading(true);
    setError(null);
    try {
      const result = await mlAPI.recommendation.getSimilarUsers(userId, count);
      setUsers(result.data.similar_users || []);
      return result.data;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to get similar users';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, error, fetchSimilarUsers };
};
