import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { MetricsController } from './metrics.controller';

@Module({
  imports: [MongooseModule.forFeature([])],
  controllers: [HealthController, MetricsController],
})
export class HealthModule {}
