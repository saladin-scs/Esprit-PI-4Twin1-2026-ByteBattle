/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { ApiKey, ApiKeyDocument } from './schemas/api-key.schema';

export type ApiAuthUser = {
  userId: string;
  email: string;
  username: string;
  roles: string[];
  type: string;
};

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectModel(ApiKey.name) private readonly model: Model<ApiKeyDocument>,
    private readonly usersService: UsersService,
  ) {}

  private hashSecret(secret: string): string {
    return createHash('sha256').update(secret, 'utf8').digest('hex');
  }

  /** Authentifie une clé complète bb_live_... ; met à jour lastUsedAt. */
  async authenticateKey(fullSecret: string): Promise<ApiAuthUser | null> {
    if (!fullSecret || !fullSecret.startsWith('bb_live_')) return null;
    const keyHash = this.hashSecret(fullSecret);
    const doc = await this.model.findOne({ keyHash }).exec();
    if (!doc) return null;
    await this.model.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date() } }).exec();
    const user = await this.usersService.findOne(String(doc.userId));
    if (!user) return null;
    const u = user as UserDocument & { email?: string; username?: string; roles?: string[]; isAdmin?: boolean };
    const roles =
      Array.isArray(u.roles) && u.roles.length ? [...u.roles] : u.isAdmin ? ['admin'] : ['user'];
    return {
      userId: String(user._id),
      email: u.email || '',
      username: u.username || '',
      roles,
      type: 'api_key',
    };
  }

  async create(userId: string, name: string): Promise<{ id: string; name: string; secret: string; prefix: string; createdAt: string }> {
    const random = randomBytes(24).toString('hex');
    const secret = `bb_live_${random}`;
    const keyHash = this.hashSecret(secret);
    const keyPrefix = secret.slice(0, 16);
    const doc = await this.model.create({
      userId: new Types.ObjectId(userId),
      name: name.trim(),
      keyHash,
      keyPrefix,
      lastUsedAt: null,
    });
    return {
      id: String(doc._id),
      name: doc.name,
      secret,
      prefix: keyPrefix,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    };
  }

  async list(userId: string) {
    const list = await this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return list.map((k) => ({
      id: String(k._id),
      name: k.name,
      prefix: k.keyPrefix,
      lastUsedAt: k.lastUsedAt ? new Date(k.lastUsedAt).toISOString() : null,
      createdAt: k.createdAt ? new Date(k.createdAt).toISOString() : '',
    }));
  }

  async revoke(userId: string, id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException();
    const res = await this.model.deleteOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) }).exec();
    if (res.deletedCount === 0) throw new NotFoundException();
  }
}
