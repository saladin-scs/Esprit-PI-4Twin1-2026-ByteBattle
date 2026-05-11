import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

import { RecommendationModule } from '../recommendation/recommendation.module';
import { FeedbackModule } from '../feedback/feedback.module';

@Module({
  imports: [
    MongooseModule.forFeature([]),
    RecommendationModule,
    FeedbackModule,
  ],
  controllers: [HealthController, MetricsController],
})
export class HealthModule {}
