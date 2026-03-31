/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  type: string;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  body: string;

  @Prop({ type: Boolean, default: false, index: true })
  read: boolean;

  @Prop({ type: Object, default: {} })
  meta?: { href?: string; challengeId?: string; competitionId?: string };

  createdAt?: Date;
  updatedAt?: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, createdAt: -1 });
