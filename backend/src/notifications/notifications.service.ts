import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  private toItem(doc: any): NotificationItem {
    return {
      id: String(doc._id),
      type: String(doc.type ?? ''),
      title: String(doc.title ?? ''),
      body: String(doc.body ?? ''),
      meta: (doc.meta as Record<string, unknown>) ?? {},
      read: Boolean(doc.read),
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  async create(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    meta?: Record<string, unknown>;
  }): Promise<NotificationItem> {
    const created = await this.notificationModel.create({
      userId: new Types.ObjectId(input.userId),
      type: input.type,
      title: input.title,
      body: input.body,
      meta: input.meta ?? {},
      read: false,
    });
    return this.toItem(created.toObject());
  }

  async list(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const start = (safePage - 1) * safeLimit;

    const userObjectId = new Types.ObjectId(userId);
    const [rows, total, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(safeLimit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments({ userId: userObjectId }).exec(),
      this.notificationModel.countDocuments({ userId: userObjectId, read: false }).exec(),
    ]);

    return {
      items: rows.map((r) => this.toItem(r)),
      total,
      unreadCount,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notificationModel
      .updateMany({ userId: new Types.ObjectId(userId), read: false }, { $set: { read: true } })
      .exec();
  }

  async markRead(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) return;
    await this.notificationModel
      .updateOne(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
        { $set: { read: true } },
      )
      .exec();
  }
}
