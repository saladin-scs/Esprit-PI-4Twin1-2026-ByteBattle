/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  UseGuards,
  Request,
  Put,
  Body,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Request as ExpressRequest } from 'express';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Extend Express Request to include the user property added by JwtAuthGuard
interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
  };
}

// Multer file filter with proper typing
const imageFileFilter = (
  req: ExpressRequest,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
    return callback(new BadRequestException('Only image files are allowed!'), false);
  }
  callback(null, true);
};

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@Request() req: RequestWithUser) {
    return this.usersService.findOne(req.user.userId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(@Request() req: RequestWithUser, @Body() updateData: UpdateMeDto) {
    return this.usersService.updateMe(req.user.userId, updateData);
  }

  @Post('me/change-password')
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(@Request() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user stats' })
  async getMyStats(@Request() req: RequestWithUser) {
    return this.usersService.getMeStats(req.user.userId);
  }

  @Get('me/activity')
  @ApiOperation({ summary: 'Get activity heatmap and recent activity' })
  async getMyActivity(@Request() req: RequestWithUser) {
    return this.usersService.getActivity(req.user.userId);
  }

  @Get('me/skill-tree')
  @ApiOperation({ summary: 'Get skill tree progress' })
  async getMySkillTree(@Request() req: RequestWithUser) {
    return this.usersService.getSkillTree(req.user.userId);
  }

  @Get('me/new-badge')
  @ApiOperation({ summary: 'Consume and return last unlocked badge (for notification)' })
  async getNewBadge(@Request() req: RequestWithUser) {
    return this.usersService.consumeAndReturnNewBadge(req.user.userId);
  }

  /**
   * Upload avatar image
   */
  @Post('me/avatar')
  @ApiOperation({ summary: 'Upload user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads', 'avatars'),
        filename: (req, file, cb) => {
          const uniqueName = uuidv4() + extname(file.originalname);
          cb(null, uniqueName);
        },
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadAvatar(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/uploads/avatars/${file.filename}`;

    await this.usersService.updateAvatar(req.user.userId, avatarUrl);
    return { avatarUrl };
  }

  /**
   * Upload cover image
   */
  @Post('me/cover')
  @ApiOperation({ summary: 'Upload cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cover: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('cover', {
      storage: diskStorage({
        destination: join(__dirname, '..', '..', 'uploads', 'covers'),
        filename: (req, file, cb) => {
          const uniqueName = uuidv4() + extname(file.originalname);
          cb(null, uniqueName);
        },
      }),
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadCover(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: RequestWithUser,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const coverUrl = `${baseUrl}/uploads/covers/${file.filename}`;

    await this.usersService.updateCover(req.user.userId, coverUrl);
    return { coverUrl };
  }
}