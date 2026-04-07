/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CommonRateLimitModule } from '../common/common.module';
import { SiteRating, SiteRatingSchema } from './schemas/site-rating.schema';
import { SiteRatingsController } from './site-ratings.controller';
import { SiteRatingsService } from './site-ratings.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SiteRating.name, schema: SiteRatingSchema }]),
    AuthModule,
    CommonRateLimitModule,
  ],
  controllers: [SiteRatingsController],
  providers: [SiteRatingsService],
})
export class SiteRatingsModule {}
