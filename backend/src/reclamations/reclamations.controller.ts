/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActionRateLimitGuard, RateLimitAction } from '../common/action-rate-limit.guard';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { ListMineReclamationsDto } from './dto/list-mine-reclamations.dto';
import { ReclamationsService } from './reclamations.service';

@ApiTags('Reclamations')
@Controller('reclamations')
export class ReclamationsController {
  constructor(private readonly reclamationsService: ReclamationsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List my reports (paginated)' })
  async listMine(@Query() query: ListMineReclamationsDto, @Req() req: { user: { userId: string } }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    return this.reclamationsService.listMine(req.user.userId, page, limit);
  }

  @Get('me/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get one of my reports' })
  async getMine(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    return this.reclamationsService.getMine(req.user.userId, id);
  }

  @Patch('me/:id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a report (while not resolved)' })
  async cancelMine(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    const item = await this.reclamationsService.cancelMine(req.user.userId, id);
    return { ok: true as const, reclamation: item };
  }

  @Post()
  @UseGuards(JwtAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('reclamation_submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a report (authenticated user)' })
  async create(@Body() dto: CreateReclamationDto, @Req() req: { user: { userId: string } }) {
    const { id } = await this.reclamationsService.create(req.user.userId, dto);
    return { ok: true as const, id };
  }
}
