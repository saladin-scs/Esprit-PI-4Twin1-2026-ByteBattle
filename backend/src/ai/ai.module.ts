/* AI Module - Provides ML/AI services */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MLService } from './ml.service';
import { MLHttpClientService } from './ml-http-client.service';
import { MLController } from './ml.controller';
import { ChallengeModule } from '../challenges/challenges.module';

@Module({
  imports: [HttpModule, ChallengeModule],
  providers: [MLService, MLHttpClientService],
  controllers: [MLController],
  exports: [MLService],
})
export class AIModule {}
