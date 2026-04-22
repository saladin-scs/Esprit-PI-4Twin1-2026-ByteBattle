import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Reclamation {
  @Prop({ required: true, type: Types.ObjectId })
  userId!: Types.ObjectId;

  @Prop()
  userEmail?: string;

  @Prop()
  username?: string;

  @Prop({ required: true, default: 'other' })
  category!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  message!: string;

  @Prop({ required: true, default: 'open' })
  status!: 'open' | 'read' | 'resolved' | 'cancelled';
}

export type ReclamationDocument = HydratedDocument<Reclamation>;
export const ReclamationSchema = SchemaFactory.createForClass(Reclamation);

ReclamationSchema.index({ userId: 1, createdAt: -1 });
ReclamationSchema.index({ status: 1, createdAt: -1 });
ReclamationSchema.index({ category: 1, createdAt: -1 });
