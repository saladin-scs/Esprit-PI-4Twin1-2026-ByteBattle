import { Controller, Get, UseGuards, Request, Put, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@Request() req, @Body() updateData: UpdateMeDto) {
    return this.usersService.updateMe(req.user.userId, updateData);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user stats' })
  async getMyStats(@Request() req) {
    return this.usersService.getMeStats(req.user.userId);
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'Get activity heatmap and recent activity' })
  async getMyActivity(@Request() req) {
    return this.usersService.getActivity(req.user.userId);
  }

  @Get('me/skill-tree')
  @ApiOperation({ summary: 'Get skill tree progress' })
  async getMySkillTree(@Request() req) {
    return this.usersService.getSkillTree(req.user.userId);
  }

  @Get('me/new-badge')
  @ApiOperation({ summary: 'Consume and return last unlocked badge (for notification)' })
  async getNewBadge(@Request() req) {
    return this.usersService.consumeAndReturnNewBadge(req.user.userId);
  }
}

