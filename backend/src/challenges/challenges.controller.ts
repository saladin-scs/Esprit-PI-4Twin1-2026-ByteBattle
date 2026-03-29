/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChallengeService } from './challenges.service';
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto } from './dto/create-challenge.dto';
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

  // ─── Routes PUBLIQUES ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Liste des challenges avec filtres' })
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

  /** Avant toute route :id — évite que "recommended" ou "me" soient pris pour un ObjectId */
  @Get('recommended')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Défis recommandés (JWT ou clé API bb_live_… / X-Api-Key)' })
  async recommended(@Req() req: any, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 12;
    return this.challengeService.recommendForUser(req.user.userId, Number.isFinite(n) ? n : 12);
  }

  @Get('me/submissions')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes soumissions' })
  async mySubmissions(@Req() req: any, @Query('challengeId') challengeId?: string) {
    return this.challengeService.getUserSubmissions(req.user.userId, challengeId);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Stats d\'un challenge (taux d\'acceptation, etc.)' })
  async getStats(@Param('id') id: string) {
    return this.challengeService.getStats(id);
  }

  @Get(':id/my-completion')
  @UseGuards(JwtOrApiKeyAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Langages dans lesquels l\'utilisateur a résolu ce challenge' })
  async getMyCompletion(@Param('id') id: string, @Req() req: any) {
    return this.challengeService.getMyCompletion(id, req.user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un challenge' })
  async findOne(@Param('id') id: string) {
    return this.challengeService.findOne(id);
  }

  // ─── Routes PROTÉGÉES (JWT ou clé API) ──────────────────────────────────

  @Post(':id/run')
  @UseGuards(JwtOrApiKeyAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('challenge_run')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exécuter le code contre les exemples uniquement (sans enregistrer)' })
  async run(@Param('id') id: string, @Body() dto: SubmitChallengeDto) {
    return this.challengeService.run(id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtOrApiKeyAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('challenge_submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soumettre une solution' })
  async submit(@Param('id') id: string, @Body() dto: SubmitChallengeDto, @Req() req: any) {
    return this.challengeService.submit(id, req.user.userId, dto);
  }

  // ─── Communauté : Solutions ──────────────────────────────────────────────

  @Get(':id/solutions')
  @ApiOperation({ summary: 'Voir les solutions de la communauté pour un challenge' })
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
  @ApiOperation({ summary: 'Partager une solution' })
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
  @ApiOperation({ summary: 'Upvoter/Downvoter une solution' })
  async upvoteSolution(@Param('solutionId') solutionId: string, @Req() req: any) {
    return this.challengeService.upvoteSolution(req.user.userId, solutionId);
  }

  // ─── Route ADMIN (créer un challenge) ───────────────────────────────────

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
  @ApiOperation({ summary: 'Créer un challenge (admin)' })
  async create(@Body() dto: CreateChallengeDto) {
    return this.challengeService.create(dto);
  }
}
