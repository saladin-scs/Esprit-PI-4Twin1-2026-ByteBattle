/* AI Controller - REST endpoints for ML features */

import { Controller, Post, Get, Body, Param, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MLService } from './ml.service';
import {
  PredictPerformanceDto,
  GetRecommendationsDto,
  GetMatchupDto,
  GetAnalyticsDto,
  GetSimilarUsersDto,
} from './dto';

@ApiTags('ML/AI')
@Controller('api/ml')
export class MLController {
  private readonly logger = new Logger(MLController.name);

  constructor(private mlService: MLService) {}

  @Post('predict-performance')
  @ApiOperation({ summary: 'Predict user performance on a challenge' })
  @ApiResponse({
    status: 200,
    description: 'Performance prediction with success probability',
  })
  async predictPerformance(@Body() dto: PredictPerformanceDto) {
    return this.mlService.predictUserPerformance(
      dto.userId,
      dto.challengeId,
      dto.userFeatures,
      dto.challengeFeatures,
    );
  }

  @Post('recommendations')
  @ApiOperation({ summary: 'Get personalized challenge recommendations' })
  @ApiResponse({
    status: 200,
    description: 'List of recommended challenges',
  })
  async getRecommendations(@Body() dto: GetRecommendationsDto) {
    return this.mlService.getPersonalizedRecommendations(
      dto.userId,
      dto.count || 5,
      dto.difficulty,
    );
  }

  @Post('recommendations/raw')
  @ApiOperation({ summary: 'Get raw AI recommendations (no DB mapping) - passthrough' })
  @ApiResponse({ status: 200, description: 'Raw AI recommendations payload' })
  async getRawRecommendations(@Body() dto: GetRecommendationsDto) {
    return this.mlService.getRawRecommendations(dto.userId, dto.count || 5, dto.difficulty);
  }

  @Get('similar-users/:userId')
  @ApiOperation({ summary: 'Get similar users' })
  @ApiResponse({
    status: 200,
    description: 'List of similar users with similarity scores',
  })
  async getSimilarUsers(
    @Param('userId') userId: string,
    @Query('count') count: number = 5,
  ) {
    return this.mlService.getSimilarUsers(userId, count);
  }

  @Post('matchup-suggestions')
  @ApiOperation({ summary: 'Get opponent suggestions for battles' })
  @ApiResponse({
    status: 200,
    description: 'List of suggested opponents',
  })
  async getMatchupSuggestions(@Body() dto: GetMatchupDto) {
    return this.mlService.findMatchupOpponents(
      dto.userId,
      dto.userFeatures,
      dto.availableUsers,
      dto.count || 3,
    );
  }

  @Post('analytics/user')
  @ApiOperation({ summary: 'Get comprehensive user analytics' })
  @ApiResponse({
    status: 200,
    description: 'User performance metrics and insights',
  })
  async getUserAnalytics(@Body() dto: GetAnalyticsDto) {
    return this.mlService.getUserAnalytics(dto.userId, dto.daysPeriod || 30);
  }

  @Get('analytics/leaderboard')
  @ApiOperation({ summary: 'Get leaderboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Global leaderboard insights',
  })
  async getLeaderboardStats() {
    return this.mlService.getLeaderboardStats();
  }

  @Get('analytics/progress/:userId')
  @ApiOperation({ summary: 'Get user progress over time' })
  @ApiResponse({
    status: 200,
    description: 'User progress metrics',
  })
  async getUserProgress(
    @Param('userId') userId: string,
    @Query('days') days: number = 30,
  ) {
    return this.mlService.getUserProgress(userId, days);
  }
}
