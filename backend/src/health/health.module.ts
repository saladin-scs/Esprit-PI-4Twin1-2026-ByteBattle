import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';

@Module({
  imports: [MongooseModule.forFeature([])],
  controllers: [HealthController],
})
export class HealthModule {}
