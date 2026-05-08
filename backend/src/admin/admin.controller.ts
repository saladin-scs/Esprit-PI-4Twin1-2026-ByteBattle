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
  @ApiOperation({ summary: 'Change a user role (e.g. promote to admin)' })
  async setUserRole(
    @Param('id') id: string,
    @Body() dto: SetRoleDto,
    @Request() req: { user: { userId: string } },
  ) {
    return this.adminService.setUserRole(id, dto.role, req.user.userId);
  }

  @Get('gamification/stats')
  @ApiOperation({ summary: 'Gamification stats (admin)' })
  getGamificationStats() {
    return this.adminService.getGamificationStats();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Overview (users, challenges, competitions, submissions)' })
  getDashboardOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get('ml-insights')
  @ApiOperation({
    summary: 'Platform health-style insights (active users, average XP, suggested focus areas)',
  })
  getMlInsights() {
    return this.adminService.getMlInsights();
  }

  @Get('chat-reports')
  @ApiOperation({ summary: 'Chat message reports (moderation)' })
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
  @ApiOperation({ summary: 'List reports (admin)' })
  async listReclamations(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('sort') sort?: 'newest' | 'oldest',
  ) {
    return this.reclamationsService.listForAdmin(page ? Number(page) : 1, limit ? Number(limit) : 20, {
      status: status || undefined,
      category: category || undefined,
      q: q || undefined,
      sort: sort === 'oldest' ? 'oldest' : 'newest',
    });
  }

  @Get('reclamations/summary')
  @ApiOperation({ summary: 'Reports summary KPI (admin)' })
  getReclamationSummary() {
    return this.reclamationsService.getAdminSummary();
  }

  @Get('reclamations/:id')
  @ApiOperation({ summary: 'Get report details (admin)' })
  async getReclamation(@Param('id') id: string) {
    return this.reclamationsService.getForAdmin(id);
  }

  @Patch('reclamations/:id')
  @ApiOperation({ summary: 'Update report status (admin)' })
  async patchReclamation(@Param('id') id: string, @Body() dto: AdminUpdateReclamationDto) {
    const reclamation = await this.reclamationsService.updateStatusAdmin(id, dto.status);
    return { ok: true as const, reclamation };
  }
}

