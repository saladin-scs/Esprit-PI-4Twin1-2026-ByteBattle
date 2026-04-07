/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompetitionsService } from './competitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { SubmitCompetitionDto } from './dto/submit-competition.dto';
import { GetCompetitionsDto } from './dto/get-competitions.dto';
import { GetCompetitionLeaderboardDto } from './dto/get-competition-leaderboard.dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Get competition by ID' })
  async findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Get competition leaderboard' })
  async getLeaderboard(
    @Param('id') id: string,
    @Query() query: GetCompetitionLeaderboardDto,
  ) {
    return this.competitionsService.getLeaderboard(id, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create competition (admin only)' })
  async create(@Body() dto: CreateCompetitionDto) {
    return this.competitionsService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update competition (admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.competitionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete competition (admin only)' })
  async delete(@Param('id') id: string) {
    return this.competitionsService.delete(id);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a competition' })
  async join(@Param('id') id: string, @Request() req: any) {
    return this.competitionsService.join(id, req.user.userId);
  }

  @Post(':id/run')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Run code for a competition challenge without saving' })
  async run(
    @Param('id') id: string,
    @Request() req: any,
    @Body() dto: SubmitCompetitionDto,
  ) {
    return this.competitionsService.run(id, req.user.userId, dto);
  }

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update competition status (admin only, e.g. active → closed)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'scheduled' | 'active' | 'closed' | 'archived' },
  ) {
    return this.competitionsService.updateStatus(id, body.status);
  }
}
