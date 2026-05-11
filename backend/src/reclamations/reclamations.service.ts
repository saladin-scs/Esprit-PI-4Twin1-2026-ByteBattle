/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { Reclamation, ReclamationDocument } from './schemas/reclamation.schema';

const RECLAMATION_STATUSES = ['open', 'read', 'resolved', 'cancelled'] as const;
const RECLAMATION_CATEGORIES = ['bug', 'account', 'content', 'harassment', 'other'] as const;

type ReclamationStatus = (typeof RECLAMATION_STATUSES)[number];
type ReclamationCategory = (typeof RECLAMATION_CATEGORIES)[number];
type ReclamationSort = 'newest' | 'oldest';

export type ReclamationMineItem = {
  id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
};

export type ReclamationAdminItem = ReclamationMineItem & {
  userId: string;
  userEmail?: string;
  username?: string;
};

export type ReclamationAdminSummary = {
  total: number;
  unresolved: number;
  staleUnresolved: number;
  byStatus: Record<ReclamationStatus, number>;
  byCategory: Record<ReclamationCategory, number>;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toMineItem(d: {
  _id: Types.ObjectId;
  category: string;
  subject: string;
  message: string;
  status: string;
  createdAt?: Date;
}): ReclamationMineItem {
  const created = d.createdAt;
  return {
    id: String(d._id),
    category: d.category,
    subject: d.subject,
    message: d.message,
    status: d.status,
    createdAt: created ? new Date(created).toISOString() : new Date(0).toISOString(),
  };
}

@Injectable()
export class ReclamationsService {
  constructor(
    @InjectModel(Reclamation.name) private readonly reclamationModel: Model<ReclamationDocument>,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateReclamationDto): Promise<{ id: string }> {
    const user = await this.usersService.findOne(userId);
    const doc = await this.reclamationModel.create({
      userId: new Types.ObjectId(userId),
      userEmail: user?.email,
      username: user?.username,
      category: dto.category ?? 'other',
      subject: dto.subject.trim(),
      message: dto.message.trim(),
    });
    return { id: String(doc._id) };
  }

  async listMine(
    userId: string,
    page = 1,
    limit = 20,
    filters?: { status?: string; category?: string; q?: string; sort?: ReclamationSort },
  ): Promise<{ items: ReclamationMineItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId) };
    if (filters?.status && RECLAMATION_STATUSES.includes(filters.status as ReclamationStatus)) {
      filter.status = filters.status;
    }
    if (filters?.category && RECLAMATION_CATEGORIES.includes(filters.category as ReclamationCategory)) {
      filter.category = filters.category;
    }
    if (filters?.q?.trim()) {
      const term = escapeRegex(filters.q.trim().slice(0, 200));
      filter.$or = [{ subject: new RegExp(term, 'i') }, { message: new RegExp(term, 'i') }];
    }
    const sortByCreatedAt = filters?.sort === 'oldest' ? 1 : -1;
    const [total, docs] = await Promise.all([
      this.reclamationModel.countDocuments(filter).exec(),
      this.reclamationModel
        .find(filter)
        .sort({ createdAt: sortByCreatedAt })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean()
        .exec(),
    ]);
    const items: ReclamationMineItem[] = docs.map((d) =>
      toMineItem({
        _id: d._id,
        category: d.category,
        subject: d.subject,
        message: d.message,
        status: d.status,
        createdAt: (d as { createdAt?: Date }).createdAt,
      }),
    );
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return { items, total, page: safePage, limit: safeLimit, totalPages };
  }

  async getMine(userId: string, id: string): Promise<ReclamationMineItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Report not found');
    const doc = await this.reclamationModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Report not found');
    const base = toMineItem({
      _id: doc._id,
      category: doc.category,
      subject: doc.subject,
      message: doc.message,
      status: doc.status,
      createdAt: (doc as { createdAt?: Date }).createdAt,
    });
    return base;
  }

  async listForAdmin(
    page = 1,
    limit = 20,
    filters?: { status?: string; category?: string; q?: string; sort?: ReclamationSort },
  ): Promise<{
    items: ReclamationAdminItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const filter: Record<string, unknown> = {};
    if (filters?.status && RECLAMATION_STATUSES.includes(filters.status as ReclamationStatus)) {
      filter.status = filters.status;
    }
    if (filters?.category && RECLAMATION_CATEGORIES.includes(filters.category as ReclamationCategory)) {
      filter.category = filters.category;
    }
    if (filters?.q?.trim()) {
      const term = escapeRegex(filters.q.trim().slice(0, 200));
      filter.$or = [
        { subject: new RegExp(term, 'i') },
        { message: new RegExp(term, 'i') },
        { username: new RegExp(term, 'i') },
        { userEmail: new RegExp(term, 'i') },
      ];
    }
    const sortByCreatedAt = filters?.sort === 'oldest' ? 1 : -1;
    const [total, docs] = await Promise.all([
      this.reclamationModel.countDocuments(filter).exec(),
      this.reclamationModel
        .find(filter)
        .sort({ createdAt: sortByCreatedAt })
        .skip((safePage - 1) * safeLimit)
        .limit(safeLimit)
        .lean()
        .exec(),
    ]);
    const items: ReclamationAdminItem[] = docs.map((d) => {
      const base = toMineItem({
        _id: d._id,
        category: d.category,
        subject: d.subject,
        message: d.message,
        status: d.status,
        createdAt: (d as { createdAt?: Date }).createdAt,
      });
      return {
        ...base,
        userId: String(d.userId),
        userEmail: d.userEmail,
        username: d.username,
      };
    });
    const totalPages = Math.max(1, Math.ceil(total / safeLimit));
    return { items, total, page: safePage, limit: safeLimit, totalPages };
  }

  async getAdminSummary(): Promise<ReclamationAdminSummary> {
    const [total, unresolved, staleUnresolved, byStatusRows, byCategoryRows] = await Promise.all([
      this.reclamationModel.countDocuments({}).exec(),
      this.reclamationModel.countDocuments({ status: { $in: ['open', 'read'] } }).exec(),
      this.reclamationModel
        .countDocuments({
          status: { $in: ['open', 'read'] },
          createdAt: { $lte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        })
        .exec(),
      this.reclamationModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .exec(),
      this.reclamationModel
        .aggregate<{ _id: string; count: number }>([
          { $group: { _id: '$category', count: { $sum: 1 } } },
        ])
        .exec(),
    ]);

    const byStatus: Record<ReclamationStatus, number> = {
      open: 0,
      read: 0,
      resolved: 0,
      cancelled: 0,
    };
    for (const row of byStatusRows) {
      if (RECLAMATION_STATUSES.includes(row._id as ReclamationStatus)) {
        byStatus[row._id as ReclamationStatus] = row.count;
      }
    }

    const byCategory: Record<ReclamationCategory, number> = {
      bug: 0,
      account: 0,
      content: 0,
      harassment: 0,
      other: 0,
    };
    for (const row of byCategoryRows) {
      if (RECLAMATION_CATEGORIES.includes(row._id as ReclamationCategory)) {
        byCategory[row._id as ReclamationCategory] = row.count;
      }
    }

    return {
      total,
      unresolved,
      staleUnresolved,
      byStatus,
      byCategory,
    };
  }

  async getForAdmin(id: string): Promise<ReclamationAdminItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Report not found');
    const doc = await this.reclamationModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Report not found');
    const base = toMineItem({
      _id: doc._id,
      category: doc.category,
      subject: doc.subject,
      message: doc.message,
      status: doc.status,
      createdAt: (doc as { createdAt?: Date }).createdAt,
    });
    return {
      ...base,
      userId: String(doc.userId),
      userEmail: doc.userEmail,
      username: doc.username,
    };
  }

  async updateStatusAdmin(id: string, status: ReclamationStatus): Promise<ReclamationAdminItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Report not found');
    const doc = await this.reclamationModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Report not found');
    doc.status = status;
    await doc.save();
    return this.getForAdmin(id);
  }

  /** User cancellation while the report is not yet resolved or already cancelled. */
  async cancelMine(userId: string, id: string): Promise<ReclamationMineItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Report not found');
    const doc = await this.reclamationModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!doc) throw new NotFoundException('Report not found');
    if (doc.status === 'cancelled' || doc.status === 'resolved') {
      throw new ConflictException('This report can no longer be cancelled.');
    }
    doc.status = 'cancelled';
    await doc.save();
    return this.getMine(userId, id);
  }
}
