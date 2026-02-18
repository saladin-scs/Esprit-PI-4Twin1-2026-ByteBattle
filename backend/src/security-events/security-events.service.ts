import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SecurityEvent, SecurityEventDocument } from './schemas/security-event.schema';

@Injectable()
export class SecurityEventsService {
  constructor(
    @InjectModel(SecurityEvent.name)
    private readonly model: Model<SecurityEventDocument>,
  ) {}

  async record(event: {
    type: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    await this.model.create(event);
  }
}

