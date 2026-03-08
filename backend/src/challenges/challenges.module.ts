/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengeController } from './challenges.controller';
import { ChallengeService } from './challenges.service';
import { CodeExecutorService } from './code-executor.service';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { Submission, SubmissionSchema } from './schemas/Submission.schema';
import { Solution, SolutionSchema } from './schemas/solution.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Solution.name, schema: SolutionSchema },
    ]),
  ],
  controllers: [ChallengeController],
  providers: [ChallengeService, CodeExecutorService],
  exports: [ChallengeService],
})
export class ChallengeModule {}