/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  meta?: { href?: string; challengeId?: string; competitionId?: string };
};

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private readonly model: Model<NotificationDocument>) {}

  async create(input: CreateNotificationInput): Promise<void> {
    await this.model.create({
      userId: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      body: input.body,
      read: false,
      meta: input.meta || {},
    });
  }

  async list(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const filter = { userId: new Types.ObjectId(userId) };
    const [items, total, unreadCount] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
      this.model.countDocuments({ ...filter, read: false }).exec(),
    ]);
    return {
      items: items.map((n) => ({
        id: String(n._id),
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        meta: n.meta || {},
        createdAt: n.createdAt ? new Date(n.createdAt).toISOString() : '',
      })),
      total,
      unreadCount,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const res = await this.model
      .updateOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }, { $set: { read: true } })
      .exec();
    if (res.matchedCount === 0) throw new NotFoundException();
  }

  async markAllRead(userId: string): Promise<void> {
    await this.model.updateMany({ userId: new Types.ObjectId(userId), read: false }, { $set: { read: true } }).exec();
  }
}
