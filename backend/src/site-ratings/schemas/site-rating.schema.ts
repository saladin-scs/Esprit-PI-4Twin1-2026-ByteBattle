import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class SiteRating {
  @Prop({ required: true, type: Types.ObjectId, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  stars!: number;
}

export type SiteRatingDocument = HydratedDocument<SiteRating>;
export const SiteRatingSchema = SchemaFactory.createForClass(SiteRating);
