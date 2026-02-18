import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verify } from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private messageWindowMs = 10_000;
  private maxMessagesPerWindow = 20;
  private messageCounters = new Map<string, { windowStart: number; count: number }>();

  private getBearerToken(client: Socket): string | null {
    const authToken = (client.handshake as any)?.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) return authToken.trim();

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }
    return null;
  }

  private attachUserOrDisconnect(client: Socket) {
    const token = this.getBearerToken(client);
    if (!token) {
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
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles || [],
        username: payload.username,
      };
    } catch {
      client.disconnect(true);
    }
  }

  private validateRoom(room: string): boolean {
    if (!room || typeof room !== 'string') return false;
    if (room.length > 100) return false;
    // allow only namespaced rooms
    if (!(room.startsWith('competition:') || room.startsWith('challenge:'))) return false;
    return /^[a-zA-Z0-9:_-]+$/.test(room);
  }

  private enforceRateLimit(client: Socket): boolean {
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

  handleConnection(client: Socket) {
    this.attachUserOrDisconnect(client);
    if (!client.connected) return;
    console.log(`Client connected: ${client.id} user=${client.data.user?.userId}`);
  }

  handleDisconnect(client: Socket) {
    this.messageCounters.delete(client.id);
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(client: Socket, room: string) {
    if (!client.data.user) return;
    if (!this.validateRoom(room)) return;
    client.join(room);
    this.server.to(room).emit('user-joined', { userId: client.data.user.userId });
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(client: Socket, room: string) {
    if (!client.data.user) return;
    if (!this.validateRoom(room)) return;
    client.leave(room);
    this.server.to(room).emit('user-left', { userId: client.data.user.userId });
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: { room: string; message: string; user: string }) {
    if (!client.data.user) return;
    if (!payload?.room || !this.validateRoom(payload.room)) return;
    if (!payload?.message || typeof payload.message !== 'string') return;
    if (payload.message.length > 2000) return;
    if (!this.enforceRateLimit(client)) return;

    this.server.to(payload.room).emit('message', {
      message: payload.message,
      user: {
        userId: client.data.user.userId,
        username: client.data.user.username,
      },
      timestamp: new Date(),
    });
  }
}

