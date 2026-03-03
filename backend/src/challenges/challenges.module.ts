/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengeController } from './challenges.controller';
import { ChallengeService } from './challenges.service';
import { CodeExecutorService } from './code-executor.service';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { Submission, SubmissionSchema } from './schemas/Submission.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
  ],
  controllers: [ChallengeController],
  providers: [ChallengeService, CodeExecutorService],
  exports: [ChallengeService],
})
export class ChallengeModule {}