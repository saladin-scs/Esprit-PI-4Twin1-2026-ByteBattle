/* eslint-disable prettier/prettier */
import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeysService } from './api-keys.service';

@ApiTags('API keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create key (secret shown only once)' })
  async create(@Body() dto: CreateApiKeyDto, @Req() req: { user: { userId: string } }) {
    return this.apiKeysService.create(req.user.userId, dto.name);
  }

  @Get()
  @ApiOperation({ summary: 'List my keys (without secret)' })
  async list(@Req() req: { user: { userId: string } }) {
    const keys = await this.apiKeysService.list(req.user.userId);
    return { keys };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke a key' })
  async revoke(@Param('id') id: string, @Req() req: { user: { userId: string } }) {
    await this.apiKeysService.revoke(req.user.userId, id);
    return { ok: true as const };
  }
}
