/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class ApiKey {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true, maxlength: 120 })
  name: string;

  /** SHA-256 hex of full secret (bb_live_...) */
  @Prop({ type: String, required: true })
  keyHash: string;

  /** First characters for display (e.g. bb_live_a1b2) */
  @Prop({ type: String, required: true })
  keyPrefix: string;

  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export type ApiKeyDocument = HydratedDocument<ApiKey>;
export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
