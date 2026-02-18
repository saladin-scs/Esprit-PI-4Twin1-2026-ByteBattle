import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('Users (Public)')
@Controller('users/public')
export class UsersPublicController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':username')
  @ApiOperation({ summary: 'Get public profile by username' })
  async getPublicByUsername(@Param('username') username: string) {
    return this.usersService.findPublicByUsername(username);
  }
}

