/* eslint-disable prettier/prettier */
import { Controller, Get, UseGuards, Request, Put, Body, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Users')
@Controller('users')
// FIX: @UseGuards(JwtAuthGuard) removed from class level.
// /register-face and /verify-face routes are public (before login).
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Public routes (without JWT)

  @Post('register-face')
  @ApiOperation({ summary: 'Register a face embedding for a userId' })
  async registerFace(@Body() body: { userId: string; embedding: number[] }) {
    await this.usersService.registerFace(body.userId, body.embedding);
    return { success: true };
  }

  @Post('verify-face')
  @ApiOperation({ summary: 'Verify face for login (by email)' })
  async verifyFace(@Body() body: { email: string; embedding: number[] }) {
    // FIX: accepts email instead of userId - consistent with Register.tsx and Login.tsx
    const match = await this.usersService.verifyFaceByEmail(body.email, body.embedding);
    return { match };
  }

  // Protected routes (JWT required)

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

  @Post('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'avatars');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const userId = (req as any).user?.userId || 'user';
          const ext = extname(file.originalname) || '.jpg';
          const safeExt = ['.png', '.jpeg', '.jpg', '.webp'].includes(ext.toLowerCase()) ? ext : '.jpg';
          cb(null, `${userId}-${Date.now()}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new BadRequestException('Only PNG, JPG, WEBP images allowed'), false);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload avatar image' })
  async uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req?.protocol || 'http';
    const host = typeof req?.get === 'function' ? req.get('host') : req?.headers?.host;
    const inferredBaseUrl = host ? `${protocol}://${host}` : '';
    const baseUrl = inferredBaseUrl || process.env.API_URL || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    const avatarPath = `/uploads/avatars/${file.filename}`;
    const avatarUrl = `${baseUrl.replace(/\/$/, '')}${avatarPath}`;
    await this.usersService.updateAvatar(req.user.userId, avatarUrl);
    return { avatarUrl, avatarPath };
  }

  @Post('me/cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(process.cwd(), 'uploads', 'covers');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (req, file, cb) => {
          const userId = (req as any).user?.userId || 'user';
          const ext = extname(file.originalname) || '.jpg';
          const safeExt = ['.png', '.jpeg', '.jpg', '.webp'].includes(ext.toLowerCase()) ? ext : '.jpg';
          cb(null, `${userId}-${Date.now()}${safeExt}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new BadRequestException('Only PNG, JPG, WEBP images allowed'), false);
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload cover image' })
  async uploadCover(@Request() req, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const protocol = forwardedProto || req?.protocol || 'http';
    const host = typeof req?.get === 'function' ? req.get('host') : req?.headers?.host;
    const inferredBaseUrl = host ? `${protocol}://${host}` : '';
    const baseUrl = inferredBaseUrl || process.env.API_URL || process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`;
    const coverPath = `/uploads/covers/${file.filename}`;
    const coverUrl = `${baseUrl.replace(/\/$/, '')}${coverPath}`;
    await this.usersService.updateCover(req.user.userId, coverUrl);
    return { coverUrl, coverImage: coverUrl, coverPath };
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

  @Get('me/data-export')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export account-related JSON data (GDPR / portability)' })
  async getDataExport(@Request() req) {
    return this.usersService.buildPersonalDataExport(req.user.userId);
  }
}