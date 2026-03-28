/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ReclamationCategory = 'bug' | 'account' | 'content' | 'harassment' | 'other';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Reclamation {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, trim: true })
  userEmail?: string;

  @Prop({ type: String, trim: true })
  username?: string;

  @Prop({
    type: String,
    enum: ['bug', 'account', 'content', 'harassment', 'other'],
    default: 'other',
  })
  category: ReclamationCategory;

  @Prop({ type: String, required: true, trim: true })
  subject: string;

  @Prop({ type: String, required: true, trim: true })
  message: string;

  @Prop({
    type: String,
    enum: ['open', 'read', 'resolved', 'cancelled'],
    default: 'open',
  })
  status: 'open' | 'read' | 'resolved' | 'cancelled';
}

export type ReclamationDocument = HydratedDocument<Reclamation>;
export const ReclamationSchema = SchemaFactory.createForClass(Reclamation);
