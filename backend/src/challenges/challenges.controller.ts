/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChallengeService } from './challenges.service';
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto, UpdateChallengeDto } from './dto/create-challenge.dto';
import { CreateSolutionDto } from './dto/solution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActionRateLimitGuard, RateLimitAction } from '../common/action-rate-limit.guard';

@ApiTags('Challenges')
@Controller('challenges')
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  // Public routes

  @Get()
  @ApiOperation({ summary: 'List challenges with filters' })
  async findAll(@Query() query: GetChallengesDto) {
    return this.challengeService.findAll(query);
  }

  @Post('dev/post-easy-medium-hard')
  @ApiOperation({
    summary:
      'DEV: create 1 easy + 1 medium + 1 hard sample challenge (ENABLE_DEV_CHALLENGE_SEED=true)',
  })
  async devPostEasyMediumHard() {
    return this.challengeService.seedDevEasyMediumHard();
  }

  /** Before any :id route - prevents "recommended" or "me" from being interpreted as ObjectId */
  @Get('recommended')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Recommended challenges (JWT or bb_live_ API key / X-Api-Key)' })
  async recommended(@Req() req: any, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 12;
    return this.challengeService.recommendForUser(req.user.userId, Number.isFinite(n) ? n : 12);
  }

  @Get('me/submissions')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My submissions (add ?details=true for full test results)' })
  async mySubmissions(@Req() req: any, @Query('challengeId') challengeId?: string, @Query('details') details?: string) {
    return this.challengeService.getUserSubmissions(req.user.userId, challengeId, details === 'true');
  }

  @Get(':id/my-history')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My detailed submission history for this challenge (code + full test results)' })
  async myHistory(@Param('id') challengeId: string, @Req() req: any) {
    return this.challengeService.getMyHistoryDetailed(challengeId, req.user.userId);
  }

  @Get(':id/official-solution')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Official solution (revealed only after solving the challenge). Optional ?language=javascript' })
  async officialSolution(
    @Param('id') challengeId: string, 
    @Req() req: any, 
    @Query('language') language?: string
  ) {
    return this.challengeService.getOfficialSolutionIfSolved(challengeId, req.user.userId, language);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Challenge stats (acceptance rate, etc.)' })
  async getStats(@Param('id') id: string) {
    return this.challengeService.getStats(id);
  }

  @Get(':id/my-completion')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Languages in which user solved this challenge' })
  async getMyCompletion(@Param('id') id: string, @Req() req: any) {
    return this.challengeService.getMyCompletion(id, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Challenge details' })
  async findOne(@Param('id') id: string) {
    return this.challengeService.findOne(id);
  }

  @Get('admin/:id/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Challenge analytics: users who solved and participated' })
  async getChallengeAnalytics(@Param('id') id: string) {
    return this.challengeService.getChallengeAnalytics(id);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Challenge details for admin' })
  async findOneAdmin(@Param('id') id: string) {
    return this.challengeService.findOneAdmin(id);
  }

  // Protected routes (JWT or API key)

  @Post(':id/run')
  @UseGuards(JwtOrApiKeyAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('challenge_run')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run code against examples only (without saving)' })
  async run(@Param('id') id: string, @Body() dto: SubmitChallengeDto, @Req() req: any) {
    return this.challengeService.run(id, dto, req.user.userId);
  }

  @Post(':id/submit')
  @UseGuards(JwtOrApiKeyAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('challenge_submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a solution' })
  async submit(@Param('id') id: string, @Body() dto: SubmitChallengeDto, @Req() req: any) {
    return this.challengeService.submit(id, req.user.userId, dto);
  }

  // Community: Solutions

  @Get(':id/solutions')
  @ApiOperation({ summary: 'View community solutions for a challenge' })
  async getSolutions(
    @Param('id') challengeId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.challengeService.getSolutions(challengeId, page, limit);
  }

  @Post(':id/solutions')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Share a solution' })
  async createSolution(
    @Param('id') challengeId: string,
    @Body() dto: CreateSolutionDto,
    @Req() req: any,
  ) {
    return this.challengeService.createSolution(req.user.userId, challengeId, dto);
  }

  @Post('solutions/:solutionId/upvote')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvote/downvote a solution' })
  async upvoteSolution(@Param('solutionId') solutionId: string, @Req() req: any) {
    return this.challengeService.upvoteSolution(req.user.userId, solutionId);
  }

  // Admin route (create challenge)

  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seed 2 easy + 2 medium + 2 hard challenges (idempotent)' })
  async seed() {
    return this.challengeService.seed();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a challenge (admin)' })
  async create(@Body() dto: CreateChallengeDto) {
    return this.challengeService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a challenge (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateChallengeDto) {
    return this.challengeService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a challenge (admin)' })
  async remove(@Param('id') id: string) {
    return this.challengeService.remove(id);
  }
}
