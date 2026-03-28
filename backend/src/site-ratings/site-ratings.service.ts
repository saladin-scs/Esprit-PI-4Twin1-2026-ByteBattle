/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SITE_RATING_MAX_STARS, SiteRating, SiteRatingDocument } from './schemas/site-rating.schema';

@Injectable()
export class SiteRatingsService {
  constructor(@InjectModel(SiteRating.name) private readonly siteRatingModel: Model<SiteRatingDocument>) {}

  async getStats(): Promise<{ average: number; count: number; maxStars: number }> {
    const [row] = await this.siteRatingModel
      .aggregate<{ average: number | null; count: number }>([
        { $group: { _id: null, average: { $avg: '$stars' }, count: { $sum: 1 } } },
      ])
      .exec();
    const count = row?.count ?? 0;
    const average = count > 0 && row?.average != null ? Math.round(row.average * 100) / 100 : 0;
    return { average, count, maxStars: SITE_RATING_MAX_STARS };
  }

  async getMine(userId: string): Promise<{ stars: number | null }> {
    const doc = await this.siteRatingModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .select('stars')
      .lean()
      .exec();
    return { stars: doc?.stars ?? null };
  }

  async setRating(userId: string, stars: number): Promise<{ ok: true; stars: number }> {
    await this.siteRatingModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      { $set: { stars } },
      { upsert: true, new: true },
    );
    return { ok: true as const, stars };
  }
}
