/* eslint-disable prettier/prettier */
import { Controller, Get, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard, Roles } from '../core';
import { AdminService } from './admin.service';
import { ChatService } from '../chat/chat.service';
import { ReclamationsService } from '../reclamations/reclamations.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { SetRoleDto } from './dto/set-role.dto';
import { AdminUpdateReclamationDto } from './dto/admin-update-reclamation.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly chatService: ChatService,
    private readonly reclamationsService: ReclamationsService,
  ) {}

  @Get('users')
  @ApiOperation({ summary: 'List users (admin)' })
  async listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('emailVerified') emailVerified?: string,
  ) {
    return this.adminService.listUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      q,
      role,
      isActive: typeof isActive === 'string' ? isActive === 'true' : undefined,
      emailVerified:
        typeof emailVerified === 'string' ? emailVerified === 'true' : undefined,
    });
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user (admin)' })
  async updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.adminService.updateUser(id, dto as any, req.user.userId);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Changer le rôle d\'un utilisateur (ex: promouvoir en admin)' })
  async setUserRole(
    @Param('id') id: string,
    @Body() dto: SetRoleDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.adminService.setUserRole(id, dto.role, req.user.userId);
  }

  @Get('gamification/stats')
  @ApiOperation({ summary: 'Statistiques gamification (admin)' })
  getGamificationStats() {
    return this.adminService.getGamificationStats();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Vue d’ensemble (users, challenges, competitions, soumissions)' })
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('ml-insights')
  @ApiOperation({
    summary: 'ML-style platform insights (health index, entropy, 7d growth, recommendations)',
  })
  getMlInsights() {
    return this.adminService.getMlInsights();
  }

  @Get('chat-reports')
  @ApiOperation({ summary: 'Signalements de messages chat (modération)' })
  async chatReports(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: 'open' | 'reviewed',
  ) {
    return this.chatService.listReportsForAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 30,
      status === 'open' || status === 'reviewed' ? status : undefined,
    );
  }

  @Get('reclamations')
  @ApiOperation({ summary: 'Lister les réclamations (admin)' })
  async listReclamations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    return this.reclamationsService.listForAdmin(page ? Number(page) : 1, limit ? Number(limit) : 20, {
      status: status || undefined,
      q: q || undefined,
    });
  }

  @Get('reclamations/:id')
  @ApiOperation({ summary: 'Détail d’une réclamation (admin)' })
  async getReclamation(@Param('id') id: string) {
    return this.reclamationsService.getForAdmin(id);
  }

  @Patch('reclamations/:id')
  @ApiOperation({ summary: 'Mettre à jour le statut d’une réclamation (admin)' })
  async patchReclamation(@Param('id') id: string, @Body() dto: AdminUpdateReclamationDto) {
    const reclamation = await this.reclamationsService.updateStatusAdmin(id, dto.status);
    return { ok: true as const, reclamation };
  }
}

