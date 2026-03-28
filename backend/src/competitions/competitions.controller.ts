/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompetitionsService } from './competitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActionRateLimitGuard, RateLimitAction } from '../common/action-rate-limit.guard';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { SubmitCompetitionDto } from './dto/submit-competition.dto';
import { GetCompetitionsDto } from './dto/get-competitions.dto';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Get()
  @ApiOperation({ summary: 'List competitions (optional filter by status)' })
  async findAll(@Query() query: GetCompetitionsDto) {
    return this.competitionsService.findAll(query);
  }

  @Get('history')
  @ApiOperation({ summary: 'Archived competitions' })
  async getHistory(@Query() query: GetCompetitionsDto) {
    return this.competitionsService.getHistory(query);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Create one sample competition (uses first challenge)' })
  async seed() {
    return this.competitionsService.seedOne();
  }

  @Post('dev/seed-sample-contests')
  @ApiOperation({
    summary:
      'Insert sample contests (speed, code golf, algorithmic if ≥3 challenges). Requires ENABLE_DEV_COMPETITION_SEED or ENABLE_DEV_CHALLENGE_SEED',
  })
  async devSeedSampleContests() {
    return this.competitionsService.seedSampleContests();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get competition by ID' })
  async findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get competition leaderboard' })
  async getLeaderboard(
    @Param('id') id: string,
    @Query('language') language?: string,
    @Query('limit') limit?: number,
  ) {
    return this.competitionsService.getLeaderboard(id, { language, limit });
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create competition (admin)' })
  async create(@Body() dto: CreateCompetitionDto) {
    return this.competitionsService.create(dto);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a competition' })
  async join(@Param('id') id: string, @Request() req: any) {
    return this.competitionsService.join(id, req.user.userId);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('competition_submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit solution for a competition' })
  async submit(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: SubmitCompetitionDto,
  ) {
    return this.competitionsService.submit(id, req.user.userId, dto);
  }

  @Put(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update competition status (e.g. active → closed)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'scheduled' | 'active' | 'closed' | 'archived' },
  ) {
    return this.competitionsService.updateStatus(id, body.status);
  }
}
