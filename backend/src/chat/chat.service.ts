import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';
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
  ) {}

  assertRoom(room: string): void {
    if (!isValidChatRoom(room)) {
      throw new BadRequestException('Invalid chat room');
    }
  }

  /** Valide la salle et l’identifiant Mongo dans le nom (competition|challenge:24hex). */
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
}
