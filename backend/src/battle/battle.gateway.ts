/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { BattleService, normalizeBattleQueueMode, type BattleQueueMode } from './battle.service';
import { BattleRealtimeService } from './battle-realtime.service';

@WebSocketGateway({
  cors: {
    origin:
      (process.env.NODE_ENV || 'development') !== 'production'
        ? true
        : (process.env.CORS_ORIGIN || 'http://localhost:5173')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class BattleGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(BattleGateway.name);

  constructor(
    private readonly battleService: BattleService,
    private readonly realtime: BattleRealtimeService,
  ) {}

  afterInit(server: Server) {
    this.realtime.attachServer(server);
  }

  private getBearerToken(client: Socket): string | null {
    const authToken = (client.handshake as { auth?: { token?: string } })?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }
    return null;
  }

  private attachUserOrDisconnect(client: Socket): void {
    const token = this.getBearerToken(client);
    if (!token) {
      client.emit('error', { code: 'AUTH_REQUIRED', message: 'Token required' });
      client.disconnect(true);
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      client.disconnect(true);
      return;
    }

    try {
      const payload: { sub?: string; email?: string; username?: string; roles?: string[] } = verify(
        token,
        secret,
      ) as { sub?: string; email?: string; username?: string; roles?: string[] };
      client.data.user = {
        userId: String(payload.sub),
        email: payload.email,
        roles: payload.roles || [],
        username: payload.username || 'user',
      };
    } catch {
      client.emit('error', { code: 'AUTH_INVALID', message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleConnection(client: Socket) {
    this.attachUserOrDisconnect(client);
    if (!client.connected) return;
    const u = client.data.user;
    if (u?.userId) {
      this.realtime.replaceUserSocket(u.userId, null, client.id);
    }
    this.logger.debug(`battle ws connect socket=${client.id} user=${u?.userId}`);
  }

  handleDisconnect(client: Socket) {
    this.realtime.unregisterSocket(client.id);
    this.battleService.dequeueBySocket(client.id);
    this.logger.debug(`battle ws disconnect socket=${client.id}`);
  }

  @SubscribeMessage('join_queue')
  async handleJoinQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { mode?: string },
  ): Promise<{ ok: boolean; queued?: boolean; battleId?: string; error?: string }> {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    const mode: BattleQueueMode = normalizeBattleQueueMode(body?.mode);
    const { userId, username } = client.data.user;

    try {
      const { battle } = await this.battleService.enqueueAndMaybeMatch({
        userId,
        username,
        socketId: client.id,
        mode,
      });
      if (battle) {
        await this.battleService.notifyBattleMatched(battle);
        return { ok: true, queued: false, battleId: String(battle._id) };
      }
      return { ok: true, queued: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Matchmaking failed';
      this.logger.warn(`join_queue failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  @SubscribeMessage('leave_queue')
  handleLeaveQueue(@ConnectedSocket() client: Socket): { ok: boolean; error?: string } {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    this.battleService.dequeueUser(client.data.user.userId);
    return { ok: true };
  }

  @SubscribeMessage('join_battle')
  async handleJoinBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { battleId?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    const battleId = typeof body?.battleId === 'string' ? body.battleId.trim() : '';
    if (!battleId) return { ok: false, error: 'battleId required' };
    const { userId } = client.data.user;

    try {
      this.realtime.joinBattleRoom(client.id, battleId);
      await this.battleService.markPlayerReady(battleId, userId);
      await this.battleService.emitBattleSyncToSocket(battleId, client.id, userId);
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'join_battle failed';
      return { ok: false, error: msg };
    }
  }

  @SubscribeMessage('submit_code')
  async handleSubmitCode(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { battleId?: string; code?: string; language?: string },
  ): Promise<
    | { ok: true; passed: boolean; executionTimeMs: number; overall: { passed: number; total: number } }
    | { ok: false; error: string }
  > {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    const battleId = typeof body?.battleId === 'string' ? body.battleId.trim() : '';
    const code = typeof body?.code === 'string' ? body.code : '';
    const language = typeof body?.language === 'string' ? body.language.trim() : '';
    if (!battleId || !language) return { ok: false, error: 'battleId and language required' };

    try {
      const out = await this.battleService.submitCode(battleId, client.data.user.userId, code, language);
      return { ok: true, ...out };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Submit failed';
      return { ok: false, error: msg };
    }
  }

  @SubscribeMessage('leave_battle')
  async handleLeaveBattle(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { battleId?: string },
  ): Promise<{ ok: boolean; error?: string }> {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    const battleId = typeof body?.battleId === 'string' ? body.battleId.trim() : '';
    if (!battleId) return { ok: false, error: 'battleId required' };
    this.realtime.leaveBattleRoom(client.id, battleId);
    try {
      await this.battleService.forfeitBattle(battleId, client.data.user.userId);
      return { ok: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'leave_battle failed';
      return { ok: false, error: msg };
    }
  }
}
