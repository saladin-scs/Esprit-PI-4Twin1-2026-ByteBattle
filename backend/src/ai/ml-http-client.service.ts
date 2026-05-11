/* AI Service HTTP Client for communicating with FastAPI backend */

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MLHttpClientService {
  private readonly logger = new Logger(MLHttpClientService.name);
  private aiServiceUrl: string;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get(
      'AI_SERVICE_URL',
      'http://localhost:8001',
    );
  }

  private pick(payload: any, camelKey: string, snakeKey: string) {
    return payload?.[camelKey] ?? payload?.[snakeKey];
  }

  async predictPerformance(payload: any) {
    try {
      const requestBody = {
        user_id: this.pick(payload, 'userId', 'user_id'),
        challenge_id: this.pick(payload, 'challengeId', 'challenge_id'),
        user_features: this.pick(payload, 'userFeatures', 'user_features'),
        challenge_features: this.pick(
          payload,
          'challengeFeatures',
          'challenge_features',
        ),
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/predictions/performance`,
          requestBody,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Prediction error: ${error.message}`);
      throw error;
    }
  }

  async getRecommendations(payload: any) {
    try {
      const requestBody = {
        user_id: this.pick(payload, 'userId', 'user_id'),
        n_recommendations:
          this.pick(payload, 'count', 'n_recommendations') ?? 5,
        preferred_difficulty: this.pick(
          payload,
          'difficulty',
          'preferred_difficulty',
        ),
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/recommendations/challenges`,
          requestBody,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Recommendation error: ${error.message}`);
      throw error;
    }
  }

  async getSimilarUsers(userId: string, nSimilar: number = 5) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.aiServiceUrl}/api/recommendations/similar-users/${userId}`,
          {
            params: { n_similar: nSimilar },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Get similar users error: ${error.message}`);
      throw error;
    }
  }

  async getMatchupSuggestions(payload: any) {
    try {
      const requestBody = {
        user_id: this.pick(payload, 'userId', 'user_id'),
        user_features: this.pick(payload, 'userFeatures', 'user_features'),
        available_users: this.pick(
          payload,
          'availableUsers',
          'available_users',
        ),
        n_suggestions: this.pick(payload, 'count', 'n_suggestions') ?? 3,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/matchmaking/suggestions`,
          requestBody,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Matchup suggestion error: ${error.message}`);
      throw error;
    }
  }

  async clusterUsers(payload: any) {
    try {
      const requestBody = {
        user_ids: this.pick(payload, 'userIds', 'user_ids'),
        user_features: this.pick(payload, 'userFeatures', 'user_features'),
        algorithm: this.pick(payload, 'algorithm', 'algorithm') ?? 'kmeans',
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/matchmaking/cluster`,
          requestBody,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Clustering error: ${error.message}`);
      throw error;
    }
  }

  async getUserAnalytics(payload: any) {
    try {
      const requestBody = {
        user_id: this.pick(payload, 'userId', 'user_id'),
        time_period_days:
          this.pick(payload, 'daysPeriod', 'time_period_days') ?? 30,
      };

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/analytics/user-profile`,
          requestBody,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Analytics error: ${error.message}`);
      throw error;
    }
  }

  async getLeaderboardStats() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.aiServiceUrl}/api/analytics/leaderboard-stats`,
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Leaderboard stats error: ${error.message}`);
      throw error;
    }
  }

  async getUserProgress(userId: string, days: number = 30) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.aiServiceUrl}/api/analytics/user-progress/${userId}`,
          {
            params: { days },
          },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`User progress error: ${error.message}`);
      throw error;
    }
  }

  async healthCheck() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.aiServiceUrl}/health`),
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Health check error: ${error.message}`);
      return { status: 'unavailable' };
    }
  }
}
