/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Query, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { isValidChatRoom } from './chat-room.util';
import { ReportChatMessageDto } from './dto/report-chat-message.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Message history for a room (competition:id or challenge:id)' })
  @ApiQuery({ name: 'room', example: 'competition:507f1f77bcf86cd799439011' })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'before', required: false, description: 'Message ObjectId - pagination' })
  async history(
    @Query('room') room: string,
    @Query('limit') limitStr?: string,
    @Query('before') before?: string,
    @Req() req?: { user: { userId: string } },
  ) {
    if (!room || !isValidChatRoom(room)) {
      throw new BadRequestException('Invalid or missing room');
    }
    await this.chatService.assertMembership(room, req!.user.userId);
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const messages = await this.chatService.getHistory(room, limit, before);
    return { room, messages };
  }

  @Post('report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a message (moderation)' })
  async report(@Body() dto: ReportChatMessageDto, @Req() req: { user: { userId: string } }) {
    await this.chatService.assertMembership(dto.room, req.user.userId);
    return this.chatService.reportMessage(req.user.userId, dto);
  }
}
