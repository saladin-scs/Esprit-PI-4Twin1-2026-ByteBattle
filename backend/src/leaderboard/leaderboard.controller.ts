import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get global leaderboard' })
  async getGlobal(@Query('limit') limit: number = 100) {
    return this.leaderboardService.getGlobalLeaderboard(limit);
  }

  @Get('competition/:id')
  @ApiOperation({ summary: 'Get competition leaderboard' })
  async getCompetition(@Param('id') id: string) {
    return this.leaderboardService.getCompetitionLeaderboard(id);
  }
}

