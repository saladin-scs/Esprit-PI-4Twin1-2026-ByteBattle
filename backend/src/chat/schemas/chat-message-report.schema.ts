import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageReportDocument = ChatMessageReport & Document;

@Schema({ timestamps: true })
export class ChatMessageReport {
  @Prop({ type: Types.ObjectId, ref: 'ChatMessage', required: true, index: true })
  messageId: Types.ObjectId;

  @Prop({ required: true, index: true })
  room: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reporterUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reportedUserId: Types.ObjectId;

  @Prop({ required: true, maxlength: 2000 })
  bodySnapshot: string;

  @Prop({ maxlength: 500, trim: true })
  reason?: string;

  @Prop({ enum: ['open', 'reviewed'], default: 'open', index: true })
  status: 'open' | 'reviewed';
}

export const ChatMessageReportSchema = SchemaFactory.createForClass(ChatMessageReport);

ChatMessageReportSchema.index({ reporterUserId: 1, messageId: 1 }, { unique: true });
