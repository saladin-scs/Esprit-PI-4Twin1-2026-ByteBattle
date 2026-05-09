import axios from 'axios';

const API_BASE_URL = (
  import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }
).env?.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Prediction API
export const predictionAPI = {
  predictPerformance: (userId: string, challengeId: string, userFeatures: any, challengeFeatures: any) =>
    api.post('/api/ml/predict-performance', {
      userId,
      challengeId,
      userFeatures,
      challengeFeatures,
    }),

  batchPredict: (predictions: any[]) =>
    api.post('/api/ml/predictions/batch', predictions),

  getModelPerformance: () =>
    api.get('/api/ml/predictions/model-performance'),
};

// Recommendation API
export const recommendationAPI = {
  getChallengeRecommendations: (userId: string, count: number = 5, difficulty?: string) =>
    api.post('/api/ml/recommendations', {
      userId,
      count,
      difficulty,
    }),

  getSimilarUsers: (userId: string, count: number = 5) =>
    api.get(`/api/ml/similar-users/${userId}`, {
      params: { count },
    }),

  rebuildMatrix: (challengeData: any) =>
    api.post('/api/ml/recommendations/rebuild-matrix', challengeData),
};

// Matchmaking API
export const matchmakingAPI = {
  getMatchupSuggestions: (userId: string, userFeatures: any, availableUsers: string[], count: number = 3) =>
    api.post('/api/ml/matchup-suggestions', {
      userId,
      userFeatures,
      availableUsers,
      count,
    }),

  clusterUsers: (userIds: string[], userFeatures: any[], algorithm: string = 'kmeans') =>
    api.post('/api/ml/matchmaking/cluster', {
      user_ids: userIds,
      user_features: userFeatures,
      algorithm,
    }),

  getClusterInfo: (userId: string, userFeatures: any) =>
    api.get(`/api/ml/matchmaking/cluster-info/${userId}`, {
      params: { user_features: userFeatures },
    }),
};

// Analytics API
export const analyticsAPI = {
  getUserAnalytics: (userId: string, daysPeriod: number = 30) =>
    api.post('/api/ml/analytics/user', {
      userId,
      daysPeriod,
    }),

  getLeaderboardStats: () =>
    api.get('/api/ml/analytics/leaderboard'),

  getUserProgress: (userId: string, days: number = 30) =>
    api.get(`/api/ml/analytics/progress/${userId}`, {
      params: { days },
    }),
};

export default {
  prediction: predictionAPI,
  recommendation: recommendationAPI,
  matchmaking: matchmakingAPI,
  analytics: analyticsAPI,
};
