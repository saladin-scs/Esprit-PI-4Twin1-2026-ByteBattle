/* ML Service - Business logic for AI features */

import { Injectable, Logger } from '@nestjs/common';
import { MLHttpClientService } from './ml-http-client.service';
import { ChallengeService } from '../challenges/challenges.service';

@Injectable()
export class MLService {
  private readonly logger = new Logger(MLService.name);

  constructor(
    private mlClient: MLHttpClientService,
    private challengeService: ChallengeService,
  ) {}

  async predictUserPerformance(
    userId: string,
    challengeId: string,
    userFeatures: any,
    challengeFeatures: any,
  ) {
    try {
      const prediction = await this.mlClient.predictPerformance({
        user_id: userId,
        challenge_id: challengeId,
        user_features: userFeatures,
        challenge_features: challengeFeatures,
      });

      return {
        userId,
        challengeId,
        successProbability: prediction.success_probability,
        difficulty: prediction.difficulty_rating,
        estimatedTime: prediction.estimated_time_minutes,
        confidence: prediction.confidence,
      };
    } catch (error) {
      this.logger.error(`Prediction failed: ${error.message}`);
      throw error;
    }
  }

  async getPersonalizedRecommendations(
    userId: string,
    count: number = 5,
    difficulty?: string,
  ) {
    try {
      const recommendations = await this.mlClient.getRecommendations({
        user_id: userId,
        n_recommendations: count,
        preferred_difficulty: difficulty,
      });

      // Map AI recommendations to actual challenges in the DB when possible
      const mapped: any[] = [];
      for (const rec of recommendations.recommendations || []) {
        let resolved: any = null;
        // Try match by id or title
        const candidate =
          rec.challenge_id || rec.challenge_name || rec.title || '';
        if (candidate) {
          try {
            resolved = await this.challengeService.findByIdOrTitle(
              String(candidate),
            );
          } catch (e) {
            this.logger.warn(
              `Challenge lookup failed for '${candidate}': ${e.message || e}`,
            );
          }
        }

        if (resolved) {
          mapped.push({
            challengeId: String(resolved._id),
            challengeName: resolved.title,
            score: rec.score,
            difficulty: resolved.difficulty || rec.difficulty,
            reason: rec.reason,
          });
        } else {
          // try a best-effort fuzzy match using challenge text/tags
          try {
            const fuzzy =
              await this.challengeService.findBestMatchForText(candidate);
            if (fuzzy) {
              mapped.push({
                challengeId: String(fuzzy._id),
                challengeName: fuzzy.title,
                score: rec.score,
                difficulty: fuzzy.difficulty || rec.difficulty,
                reason: rec.reason || 'Fuzzy matched from AI suggestion',
              });
              continue;
            }
          } catch (e) {
            this.logger.warn(
              `Fuzzy lookup failed for '${candidate}': ${e.message || e}`,
            );
          }
          // if no match found, skip adding raw AI-only suggestion and let
          // DB fallbacks fill the remaining slots below
          continue;
        }
      }

      // If AI returned items that couldn't be resolved, fill remaining slots with DB fallbacks
      try {
        const ids = new Set(mapped.map((m) => m.challengeId));
        const need = Math.max(0, Number(count || 0) - mapped.length);
        if (need > 0) {
          const fallbacks =
            await this.challengeService.getFallbackRecommendations(
              need,
              difficulty,
            );
          for (const f of fallbacks) {
            if (ids.has(String(f._id))) continue;
            mapped.push({
              challengeId: String(f._id),
              challengeName: f.title,
              score: null,
              difficulty: f.difficulty,
              reason: 'Fallback: popular challenge',
            });
            ids.add(String(f._id));
            if (mapped.length >= count) break;
          }
        }
      } catch (e) {
        this.logger.warn(
          `Appending fallback recommendations failed: ${e.message || e}`,
        );
      }

      return { userId, recommendations: mapped };
    } catch (error) {
      this.logger.error(`Recommendations failed: ${error.message}`);
      throw error;
    }
  }

  /** Return raw AI recommendations from the upstream AI service without DB mapping. */
  async getRawRecommendations(
    userId: string,
    count: number = 5,
    difficulty?: string,
  ) {
    try {
      const recommendations = await this.mlClient.getRecommendations({
        user_id: userId,
        n_recommendations: count,
        preferred_difficulty: difficulty,
      });
      return recommendations;
    } catch (error) {
      this.logger.error(`Raw recommendations failed: ${error.message}`);
      throw error;
    }
  }

  async getSimilarUsers(userId: string, count: number = 5) {
    try {
      return await this.mlClient.getSimilarUsers(userId, count);
    } catch (error) {
      this.logger.error(`Get similar users failed: ${error.message}`);
      throw error;
    }
  }

  async findMatchupOpponents(
    userId: string,
    userFeatures: any,
    availableUsers: string[],
    count: number = 3,
  ) {
    try {
      const matchup = await this.mlClient.getMatchupSuggestions({
        user_id: userId,
        user_features: userFeatures,
        available_users: availableUsers,
        n_suggestions: count,
      });

      return {
        userId,
        suggestions: matchup.suggestions.map((s: any) => ({
          opponentId: s.opponent_id,
          compatibilityScore: s.compatibility_score,
          reason: s.reason,
        })),
      };
    } catch (error) {
      this.logger.error(`Matchup finding failed: ${error.message}`);
      throw error;
    }
  }

  async getUserAnalytics(userId: string, daysPeriod: number = 30) {
    try {
      const analytics = await this.mlClient.getUserAnalytics({
        user_id: userId,
        time_period_days: daysPeriod,
      });

      return {
        userId,
        metrics: {
          successRate: analytics.metrics.success_rate,
          averageDifficulty: analytics.metrics.average_difficulty,
          skillLevel: analytics.metrics.skill_level,
          improvementTrend: analytics.metrics.improvement_trend,
          recommendedFocusAreas: analytics.metrics.recommended_focus_areas,
        },
        skillCluster: analytics.skill_cluster,
        similarUsers: analytics.similar_users,
      };
    } catch (error) {
      this.logger.error(`Analytics failed: ${error.message}`);
      throw error;
    }
  }

  async getLeaderboardStats() {
    try {
      return await this.mlClient.getLeaderboardStats();
    } catch (error) {
      this.logger.error(`Leaderboard stats failed: ${error.message}`);
      throw error;
    }
  }

  async getUserProgress(userId: string, days: number = 30) {
    try {
      return await this.mlClient.getUserProgress(userId, days);
    } catch (error) {
      this.logger.error(`User progress failed: ${error.message}`);
      throw error;
    }
  }
}
