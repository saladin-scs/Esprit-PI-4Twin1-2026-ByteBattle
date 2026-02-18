import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.adminService.updateUser(id, dto as any);
  }
}

