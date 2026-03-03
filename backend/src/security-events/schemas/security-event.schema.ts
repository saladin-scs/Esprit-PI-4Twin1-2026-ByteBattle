import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SecurityEventDocument = SecurityEvent & Document;

@Schema({ timestamps: true })
export class SecurityEvent {
  @Prop({ required: true })
  type: string;

  @Prop()
  userId?: string;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;
}

export const SecurityEventSchema = SchemaFactory.createForClass(SecurityEvent);

