import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
import { ChatMessageReport, ChatMessageReportDocument } from './schemas/chat-message-report.schema';
import { isValidChatRoom, parseObjectIdSuffix } from './chat-room.util';

export interface ChatMessageView {
  id: string;
  room: string;
  userId: string;
  username: string;
  body: string;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  private static readonly MAX_HISTORY = 100;

  constructor(
    @InjectModel(ChatMessage.name)
    private readonly messageModel: Model<ChatMessageDocument>,
    @InjectModel(ChatMessageReport.name)
    private readonly reportModel: Model<ChatMessageReportDocument>,
  ) {}

  assertRoom(room: string): void {
    if (!isValidChatRoom(room)) {
      throw new BadRequestException('Invalid chat room');
    }
  }

  /** Validates room and Mongo identifier in name (competition|challenge:24hex). */
  async assertMembership(room: string, _userId: string): Promise<void> {
    this.assertRoom(room);
    const oid = parseObjectIdSuffix(room);
    if (!oid || !Types.ObjectId.isValid(oid)) {
      throw new BadRequestException('Invalid room id');
    }
  }

  async saveMessage(
    room: string,
    userId: string,
    username: string,
    body: string,
  ): Promise<ChatMessageView> {
    this.assertRoom(room);
    const doc = await this.messageModel.create({
      room,
      userId: new Types.ObjectId(userId),
      username: username || 'user',
      body,
    });
    return this.toView(doc);
  }

  async getHistory(room: string, limit = 50, before?: string): Promise<ChatMessageView[]> {
    this.assertRoom(room);
    const cap = Math.min(Math.max(1, limit), ChatService.MAX_HISTORY);
    const filter: Record<string, unknown> = { room };
    if (before && Types.ObjectId.isValid(before)) {
      filter._id = { $lt: new Types.ObjectId(before) };
    }
    const rows = await this.messageModel
      .find(filter)
      .sort({ _id: -1 })
      .limit(cap)
      .lean()
      .exec();
    return rows.reverse().map((r) => ({
      id: String(r._id),
      room: r.room,
      userId: String(r.userId),
      username: r.username,
      body: r.body,
      createdAt: (r as any).createdAt ?? new Date(),
    }));
  }

  private toView(doc: ChatMessageDocument): ChatMessageView {
    const o = doc.toObject();
    return {
      id: String(o._id),
      room: o.room,
      userId: String(o.userId),
      username: o.username,
      body: o.body,
      createdAt: (o as any).createdAt ?? new Date(),
    };
  }

  async reportMessage(
    reporterId: string,
    dto: { messageId: string; room: string; reason?: string },
  ): Promise<{ ok: true }> {
    this.assertRoom(dto.room);
    const msg = await this.messageModel.findById(dto.messageId).lean();
    if (!msg || msg.room !== dto.room) {
      throw new BadRequestException('Message not found in this room');
    }
    if (String(msg.userId) === reporterId) {
      throw new BadRequestException('You cannot report yourself');
    }
    try {
      await this.reportModel.create({
        messageId: new Types.ObjectId(dto.messageId),
        room: dto.room,
        reporterUserId: new Types.ObjectId(reporterId),
        reportedUserId: msg.userId as Types.ObjectId,
        bodySnapshot: String(msg.body).slice(0, 2000),
        reason: dto.reason?.trim() || undefined,
        status: 'open',
      });
    } catch (e: any) {
      if (e?.code === 11000) {
        throw new ConflictException('You already reported this message');
      }
      throw e;
    }
    return { ok: true };
  }

  async listReportsForAdmin(
    page = 1,
    limit = 30,
    status?: 'open' | 'reviewed',
  ): Promise<{ total: number; items: unknown[] }> {
    const cap = Math.min(100, Math.max(1, limit));
    const skip = (Math.max(1, page) - 1) * cap;
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    const [total, rows] = await Promise.all([
      this.reportModel.countDocuments(filter),
      this.reportModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(cap).lean().exec(),
    ]);
    return {
      total,
      items: rows.map((r: any) => ({
        id: String(r._id),
        messageId: String(r.messageId),
        room: r.room,
        reporterUserId: String(r.reporterUserId),
        reportedUserId: String(r.reportedUserId),
        bodySnapshot: r.bodySnapshot,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }
}
