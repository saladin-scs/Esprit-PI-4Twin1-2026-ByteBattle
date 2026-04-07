/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GamificationService } from './gamification.service';

@ApiTags('Gamification')
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Badge catalog + XP scale (public)' })
  getCatalog() {
    return this.gamificationService.getCatalog();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My gamification summary (XP, streak, badges)' })
  getMySummary(@Request() req: { user: { userId: string } }) {
    return this.gamificationService.getMySummary(req.user.userId);
  }

  @Post('daily-login')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Record daily login (XP + streak)' })
  recordDailyLogin(@Request() req: { user: { userId: string } }) {
    return this.gamificationService.recordDailyLogin(req.user.userId);
  }

  @Post('streak-freeze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Use a streak freeze' })
  useStreakFreeze(@Request() req: { user: { userId: string } }) {
    return this.gamificationService.useStreakFreeze(req.user.userId);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Classement global par XP' })
  getLeaderboard(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('country') country?: string,
  ) {
    return this.gamificationService.getLeaderboard({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      country,
    });
  }
}
