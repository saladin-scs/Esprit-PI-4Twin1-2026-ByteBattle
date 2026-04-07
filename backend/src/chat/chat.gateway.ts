import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';
import { ChatService } from './chat.service';
import { isValidChatRoom } from './chat-room.util';

@WebSocketGateway({
  cors: {
    // In dev, reflect origin (Vite on any localhost port); in prod use strict allowlist.
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
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly messageWindowMs = Number(process.env.CHAT_RATE_WINDOW_MS || 10_000);
  private readonly maxMessagesPerWindow = Number(process.env.CHAT_RATE_MAX_PER_WINDOW || 25);
  private readonly maxMessageChars = Number(process.env.CHAT_MESSAGE_MAX_CHARS || 2000);
  private readonly typingWindowMs = 4_000;
  private readonly messageCounters = new Map<string, { windowStart: number; count: number }>();
  private readonly typingLastEmit = new Map<string, number>();

  constructor(private readonly chatService: ChatService) {}

  private getBearerToken(client: Socket): string | null {
    const authToken = (client.handshake as any)?.auth?.token;
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
      client.emit('error', { code: 'AUTH_REQUIRED', message: 'Token manquant' });
      client.disconnect(true);
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      client.disconnect(true);
      return;
    }

    try {
      const payload: any = verify(token, secret);
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

  private enforceMessageRateLimit(client: Socket): boolean {
    const now = Date.now();
    const entry = this.messageCounters.get(client.id);
    if (!entry || now - entry.windowStart > this.messageWindowMs) {
      this.messageCounters.set(client.id, { windowStart: now, count: 1 });
      return true;
    }
    if (entry.count >= this.maxMessagesPerWindow) return false;
    entry.count += 1;
    return true;
  }

  private enforceTypingRateLimit(client: Socket): boolean {
    const now = Date.now();
    const last = this.typingLastEmit.get(client.id) ?? 0;
    if (now - last < this.typingWindowMs) return false;
    this.typingLastEmit.set(client.id, now);
    return true;
  }

  handleConnection(client: Socket) {
    this.attachUserOrDisconnect(client);
    if (!client.connected) return;
    this.logger.debug(`chat connect socket=${client.id} user=${client.data.user?.userId}`);
  }

  handleDisconnect(client: Socket) {
    this.messageCounters.delete(client.id);
    this.typingLastEmit.delete(client.id);
    this.logger.debug(`chat disconnect socket=${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ): { ok: boolean; error?: string } {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    if (!isValidChatRoom(room)) return { ok: false, error: 'Invalid room' };
    client.join(room);
    this.server.to(room).emit('user-joined', {
      userId: client.data.user.userId,
      username: client.data.user.username,
    });
    return { ok: true };
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ): { ok: boolean; error?: string } {
    if (!client.data.user) return { ok: false, error: 'Not authenticated' };
    if (!isValidChatRoom(room)) return { ok: false, error: 'Invalid room' };
    client.leave(room);
    this.server.to(room).emit('user-left', {
      userId: client.data.user.userId,
      username: client.data.user.username,
    });
    return { ok: true };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string; message: string },
  ): Promise<void> {
    if (!client.data.user) {
      client.emit('error', { code: 'AUTH', message: 'Not authenticated' });
      return;
    }
    if (!payload?.room || !isValidChatRoom(payload.room)) return;
    if (!payload?.message || typeof payload.message !== 'string') {
      client.emit('error', { code: 'EMPTY', message: 'Empty message.' });
      return;
    }
    const text = payload.message.trim();
    if (!text.length) {
      client.emit('error', { code: 'EMPTY', message: 'Empty message.' });
      return;
    }
    if (text.length > this.maxMessageChars) {
      client.emit('error', {
        code: 'TOO_LONG',
        message: `Message too long (max ${this.maxMessageChars} characters).`,
      });
      return;
    }
    if (!this.enforceMessageRateLimit(client)) {
      const sec = Math.ceil(this.messageWindowMs / 1000);
      client.emit('error', {
        code: 'RATE_LIMIT',
        message: `Too many messages: max ${this.maxMessagesPerWindow} messages / ${sec}s. Try again in a few seconds.`,
      });
      return;
    }

    let saved: Awaited<ReturnType<ChatService['saveMessage']>>;
    try {
      saved = await this.chatService.saveMessage(
        payload.room,
        client.data.user.userId,
        client.data.user.username,
        text,
      );
    } catch (e: any) {
      this.logger.warn(`saveMessage failed: ${e?.message ?? e}`);
      client.emit('error', { code: 'PERSIST', message: 'Unable to save message' });
      return;
    }

    this.server.to(payload.room).emit('message', {
      room: payload.room,
      id: saved.id,
      message: saved.body,
      user: {
        userId: saved.userId,
        username: saved.username,
      },
      timestamp: saved.createdAt,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string; typing: boolean },
  ): void {
    if (!client.data.user) return;
    if (!payload?.room || !isValidChatRoom(payload.room)) return;
    if (!this.enforceTypingRateLimit(client)) return;
    client.to(payload.room).emit('user-typing', {
      userId: client.data.user.userId,
      username: client.data.user.username,
      typing: !!payload.typing,
    });
  }
}
