import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  title!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: Object })
  meta?: Record<string, unknown>;

  @Prop({ default: false })
  read!: boolean;
}

export type NotificationDocument = HydratedDocument<Notification>;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
