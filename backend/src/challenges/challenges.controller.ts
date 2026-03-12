/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChallengeService } from './challenges.service';
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto } from './dto/create-challenge.dto';
import { CreateSolutionDto } from './dto/solution.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

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

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'un challenge' })
  async findOne(@Param('id') id: string) {
    return this.challengeService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Stats d\'un challenge (taux d\'acceptation, etc.)' })
  async getStats(@Param('id') id: string) {
    return this.challengeService.getStats(id);
  }

  // ─── Routes PROTÉGÉES (JWT requis) ──────────────────────────────────────

  @Post(':id/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exécuter le code contre les exemples uniquement (sans enregistrer)' })
  async run(
    @Param('id') id: string,
    @Body() dto: SubmitChallengeDto,
  ) {
    return this.challengeService.run(id, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soumettre une solution' })
  async submit(
    @Param('id') id: string,
    @Body() dto: SubmitChallengeDto,
    @Req() req: any,
  ) {
    return this.challengeService.submit(id, req.user.userId, dto);
  }

  @Get('me/submissions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mes soumissions' })
  async mySubmissions(@Req() req: any, @Query('challengeId') challengeId?: string) {
    return this.challengeService.getUserSubmissions(req.user.userId, challengeId);
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upvoter/Downvoter une solution' })
  async upvoteSolution(@Param('solutionId') solutionId: string, @Req() req: any) {
    return this.challengeService.upvoteSolution(req.user.userId, solutionId);
  }

  // ─── Route ADMIN (créer un challenge) ───────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)          // <-- added RolesGuard
  @Roles('admin')                                // <-- only admin can create
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un challenge (admin)' })
  async create(@Body() dto: CreateChallengeDto) {
    return this.challengeService.create(dto);
  }
}