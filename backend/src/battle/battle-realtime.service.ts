/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

/**
 * Bridges BattleService (no Socket dependency) with Socket.IO.
 * Populated from BattleGateway.afterInit.
 */
@Injectable()
export class BattleRealtimeService {
  private readonly logger = new Logger(BattleRealtimeService.name);
  private server: Server | null = null;
  /** userId -> socket ids */
  private readonly socketsByUser = new Map<string, Set<string>>();

  attachServer(server: Server): void {
    this.server = server;
  }

  registerUserSocket(userId: string, socketId: string): void {
    let set = this.socketsByUser.get(userId);
    if (!set) {
      set = new Set();
      this.socketsByUser.set(userId, set);
    }
    set.add(socketId);
  }

  unregisterSocket(socketId: string): void {
    for (const [uid, set] of this.socketsByUser.entries()) {
      if (set.delete(socketId) && set.size === 0) {
        this.socketsByUser.delete(uid);
      }
    }
  }

  /** Update socket association when same user reconnects (queue uses latest emit target). */
  replaceUserSocket(userId: string, oldSocketId: string | null, newSocketId: string): void {
    if (oldSocketId) {
      const set = this.socketsByUser.get(userId);
      set?.delete(oldSocketId);
      if (set?.size === 0) this.socketsByUser.delete(userId);
    }
    this.registerUserSocket(userId, newSocketId);
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`emitToUser(${event}) skipped: server not ready`);
      return;
    }
    const set = this.socketsByUser.get(userId);
    if (!set?.size) return;
    for (const sid of set) {
      this.server.to(sid).emit(event, payload);
    }
  }

  emitToBattleRoom(roomBattleId: string, event: string, payload: unknown): void {
    if (!this.server) {
      this.logger.warn(`emitToBattleRoom(${event}) skipped: server not ready`);
      return;
    }
    this.server.to(`battle:${roomBattleId}`).emit(event, payload);
  }

  emitToSocket(socketId: string, event: string, payload: unknown): void {
    if (!this.server) return;
    this.server.to(socketId).emit(event, payload);
  }

  joinBattleRoom(socketId: string, battleId: string): void {
    if (!this.server) return;
    const sock = this.server.sockets.sockets.get(socketId);
    sock?.join(`battle:${battleId}`);
  }

  leaveBattleRoom(socketId: string, battleId: string): void {
    if (!this.server) return;
    const sock = this.server.sockets.sockets.get(socketId);
    sock?.leave(`battle:${battleId}`);
  }
}
