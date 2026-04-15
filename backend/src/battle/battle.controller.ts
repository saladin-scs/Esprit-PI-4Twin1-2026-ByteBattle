/* eslint-disable prettier/prettier */
import { Body, Controller, Get, NotFoundException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BattleService, normalizeBattleQueueMode } from './battle.service';

@ApiTags('battle')
@ApiBearerAuth()
@Controller('battle')
export class BattleController {
  constructor(private readonly battleService: BattleService) {}

  @Post('queue')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Join matchmaking queue: body.mode = 1v1 | 2v2 | 3v3 | 4v4 | 5v5 (WebSocket join_queue preferred)' })
  async joinQueue(
    @Req() req: { user: { userId: string; username: string } },
    @Body() body: { mode?: string },
  ) {
    const mode = normalizeBattleQueueMode(body?.mode);
    const { battle } = await this.battleService.enqueueAndMaybeMatch({
      userId: req.user.userId,
      username: req.user.username,
      socketId: null,
      mode,
    });
    if (battle) {
      await this.battleService.notifyBattleMatched(battle);
      return {
        queued: false,
        battleId: String(battle._id),
        challengeId: String(battle.challengeId),
      };
    }
    return { queued: true };
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Poll for an in-progress battle (e.g. if match came from HTTP queue)' })
  async pending(@Req() req: { user: { userId: string } }) {
    const b = await this.battleService.getPendingBattleForUser(req.user.userId);
    if (!b) return { battle: null };
    return { battle: this.battleService.toPendingSnapshot(b) };
  }

  @Get(':id/summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Battle snapshot for a participant (result or live metadata)' })
  async summary(@Req() req: { user: { userId: string } }, @Param('id') id: string) {
    const s = await this.battleService.getSummaryForPlayer(id, req.user.userId);
    if (!s) throw new NotFoundException('Battle not found or access denied');
    return s;
  }
}
