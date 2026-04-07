import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';
import { GetLeaderboardQueryDto } from './dto/get-leaderboard-query.dto';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  /**
   * Get global leaderboard with filters
   * @param period 'all-time', 'monthly', 'weekly'
   * @param type Leaderboard type: 'global', 'speed', 'code_golf', 'algorithmic'
   * @param limit Results per page (default 50)
   * @param page Page number (default 1)
   * @param difficulty Filter by difficulty
   */
  @Get()
  @ApiOperation({ summary: 'Get global leaderboard with filtering and pagination' })
  @ApiQuery({ name: 'period', enum: ['all-time', 'monthly', 'weekly'], required: false })
  @ApiQuery({ name: 'type', enum: ['global', 'speed', 'code_golf', 'algorithmic'], required: false })
  @ApiQuery({ name: 'difficulty', enum: ['easy', 'medium', 'hard', 'expert'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  async getGlobal(@Query() query: GetLeaderboardQueryDto) {
    return this.leaderboardService.getGlobalLeaderboard(
      query.period || 'all-time',
      query.type || 'global',
      query.limit || 50,
      query.page || 1,
      query.difficulty,
    );
  }

  /**
   * Get seasonal leaderboards for all periods
   */
  @Get('seasonal')
  @ApiOperation({ summary: 'Get leaderboards for all seasons (weekly, monthly, all-time)' })
  async getSeasonal() {
    return this.leaderboardService.getSeasonalLeaderboards();
  }

  /**
   * Get user rank with context (nearby ranks)
   */
  @Get('rank/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get your rank and nearby competitors' })
  @ApiQuery({ name: 'period', enum: ['all-time', 'monthly', 'weekly'], required: false })
  async getUserRank(
    @Param('userId') userId: string,
    @Query('period') period: 'all-time' | 'monthly' | 'weekly' = 'all-time',
  ) {
    return this.leaderboardService.getUserRankContext(userId, period, 5);
  }

  /**
   * Get detailed user statistics
   */
  @Get('stats/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get detailed user statistics' })
  @ApiQuery({ name: 'period', enum: ['all-time', 'monthly', 'weekly'], required: false })
  async getUserStats(
    @Param('userId') userId: string,
    @Query('period') period: 'all-time' | 'monthly' | 'weekly' = 'all-time',
  ) {
    return this.leaderboardService.getUserDetailedStats(userId, period);
  }

  /**
   * Get trending competitions
   */
  @Get('trending')
  @ApiOperation({ summary: 'Get trending competitions' })
  async getTrending(@Query('limit') limit: number = 5) {
    return this.leaderboardService.getTrendingCompetitions(limit);
  }

  /**
   * Get competition leaderboard
   */
  @Get('competition/:competitionId')
  @ApiOperation({ summary: 'Get competition-specific leaderboard' })
  @ApiQuery({ name: 'language', required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  async getCompetition(
    @Param('competitionId') competitionId: string,
    @Query('language') language?: string,
    @Query('limit') limit: number = 50,
    @Query('page') page: number = 1,
  ) {
    return this.leaderboardService.getCompetitionLeaderboard(competitionId, language, limit, page);
  }
}

