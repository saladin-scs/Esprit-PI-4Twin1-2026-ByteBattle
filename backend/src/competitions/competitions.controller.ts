import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompetitionsService } from './competitions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all competitions' })
  async findAll() {
    return this.competitionsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get competition by ID' })
  async findOne(@Param('id') id: string) {
    return this.competitionsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new competition' })
  async create(@Body() competitionData: any) {
    return this.competitionsService.create(competitionData);
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a competition' })
  async join(@Param('id') id: string, @Request() req) {
    return this.competitionsService.joinCompetition(id, req.user.userId);
  }
}

