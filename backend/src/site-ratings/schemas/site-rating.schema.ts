/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const SITE_RATING_MAX_STARS = 5;

@Schema({ timestamps: true })
export class SiteRating {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: SITE_RATING_MAX_STARS })
  stars: number;
}

export type SiteRatingDocument = HydratedDocument<SiteRating>;
export const SiteRatingSchema = SchemaFactory.createForClass(SiteRating);
