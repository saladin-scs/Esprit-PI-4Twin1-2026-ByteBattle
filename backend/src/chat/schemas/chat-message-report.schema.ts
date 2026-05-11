import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ChatMessageReport {
  @Prop({ required: true, type: Types.ObjectId })
  messageId!: Types.ObjectId;

  @Prop({ required: true })
  room!: string;

  @Prop({ required: true, type: Types.ObjectId })
  reporterUserId!: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId })
  reportedUserId!: Types.ObjectId;

  @Prop({ required: true })
  bodySnapshot!: string;

  @Prop()
  reason?: string;

  @Prop({ default: 'open' })
  status!: 'open' | 'reviewed' | 'dismissed';
}

export type ChatMessageReportDocument = HydratedDocument<ChatMessageReport>;
export const ChatMessageReportSchema =
  SchemaFactory.createForClass(ChatMessageReport);
