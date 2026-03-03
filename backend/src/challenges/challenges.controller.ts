/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChallengeService } from './challenges.service';
import { CreateChallengeDto, GetChallengesDto, SubmitChallengeDto } from './dto/create-challenge.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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

  // ─── Route ADMIN (créer un challenge) ───────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un challenge (admin)' })
  async create(@Body() dto: CreateChallengeDto) {
    return this.challengeService.create(dto);
  }
}