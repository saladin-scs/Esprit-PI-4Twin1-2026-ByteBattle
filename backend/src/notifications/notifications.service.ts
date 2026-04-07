import { Injectable } from '@nestjs/common';

type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  private readonly items: NotificationItem[] = [];

  async create(input: {
    userId: string;
    type: string;
    title: string;
    body: string;
    meta?: Record<string, unknown>;
  }): Promise<NotificationItem> {
    const item: NotificationItem = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      meta: input.meta,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.items.unshift(item);
    return item;
  }

  async list(userId: string, page = 1, limit = 20) {
    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const all = this.items.filter((n) => n.userId === userId);
    const start = (safePage - 1) * safeLimit;
    const rows = all.slice(start, start + safeLimit);
    return {
      notifications: rows,
      total: all.length,
      page: safePage,
      totalPages: Math.max(1, Math.ceil(all.length / safeLimit)),
    };
  }

  async markAllRead(userId: string): Promise<void> {
    this.items.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
  }

  async markRead(userId: string, id: string): Promise<void> {
    const found = this.items.find((n) => n.userId === userId && n.id === id);
    if (found) found.read = true;
  }
}
