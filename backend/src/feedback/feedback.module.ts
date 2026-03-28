import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { AiModule } from '../ai/ai.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AiModule, AuthModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
