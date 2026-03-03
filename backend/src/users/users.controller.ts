/* eslint-disable prettier/prettier */
import { Controller, Get, UseGuards, Request, Put, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
// ✅ FIX : @UseGuards(JwtAuthGuard) retiré du niveau classe
// Les routes /register-face et /verify-face sont publiques (avant connexion)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── Routes PUBLIQUES (sans JWT) ────────────────────────────────────────

  @Post('register-face')
  @ApiOperation({ summary: 'Enregistre un visage pour un userId' })
  async registerFace(@Body() body: { userId: string; embedding: number[] }) {
    await this.usersService.registerFace(body.userId, body.embedding);
    return { success: true };
  }

  @Post('verify-face')
  @ApiOperation({ summary: 'Vérifie le visage pour le login (par email)' })
  async verifyFace(@Body() body: { email: string; embedding: number[] }) {
    // ✅ FIX : accepte email au lieu de userId — cohérent avec Register.tsx et Login.tsx
    const match = await this.usersService.verifyFaceByEmail(body.email, body.embedding);
    return { match };
  }

  // ─── Routes PROTÉGÉES (JWT requis) ──────────────────────────────────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@Request() req, @Body() updateData: UpdateMeDto) {
    return this.usersService.updateMe(req.user.userId, updateData);
  }

  @Post('me/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user stats' })
  async getMyStats(@Request() req) {
    return this.usersService.getMeStats(req.user.userId);
  }

  @Get('me/activity')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity heatmap and recent activity' })
  async getMyActivity(@Request() req) {
    return this.usersService.getActivity(req.user.userId);
  }

  @Get('me/skill-tree')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get skill tree progress' })
  async getMySkillTree(@Request() req) {
    return this.usersService.getSkillTree(req.user.userId);
  }

  @Get('me/new-badge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Consume and return last unlocked badge' })
  async getNewBadge(@Request() req) {
    return this.usersService.consumeAndReturnNewBadge(req.user.userId);
  }
}