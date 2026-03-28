/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { CreateReclamationDto } from './dto/create-reclamation.dto';
import { Reclamation, ReclamationDocument } from './schemas/reclamation.schema';

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
  ): Promise<{ items: ReclamationMineItem[]; total: number; page: number; limit: number; totalPages: number }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const filter = { userId: new Types.ObjectId(userId) };
    const [total, docs] = await Promise.all([
      this.reclamationModel.countDocuments(filter).exec(),
      this.reclamationModel
        .find(filter)
        .sort({ createdAt: -1 })
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
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Réclamation introuvable');
    const doc = await this.reclamationModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException('Réclamation introuvable');
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
    filters?: { status?: string; q?: string },
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
    if (filters?.status && ['open', 'read', 'resolved', 'cancelled'].includes(filters.status)) {
      filter.status = filters.status;
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
    const [total, docs] = await Promise.all([
      this.reclamationModel.countDocuments(filter).exec(),
      this.reclamationModel
        .find(filter)
        .sort({ createdAt: -1 })
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

  async getForAdmin(id: string): Promise<ReclamationAdminItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Réclamation introuvable');
    const doc = await this.reclamationModel.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('Réclamation introuvable');
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

  async updateStatusAdmin(id: string, status: 'open' | 'read' | 'resolved' | 'cancelled'): Promise<ReclamationAdminItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Réclamation introuvable');
    const doc = await this.reclamationModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Réclamation introuvable');
    doc.status = status;
    await doc.save();
    return this.getForAdmin(id);
  }

  /** Annulation par l’utilisateur tant que le dossier n’est pas clos ou déjà annulé. */
  async cancelMine(userId: string, id: string): Promise<ReclamationMineItem> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Réclamation introuvable');
    const doc = await this.reclamationModel
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    if (!doc) throw new NotFoundException('Réclamation introuvable');
    if (doc.status === 'cancelled' || doc.status === 'resolved') {
      throw new ConflictException('Cette réclamation ne peut plus être annulée.');
    }
    doc.status = 'cancelled';
    await doc.save();
    return this.getMine(userId, id);
  }
}
