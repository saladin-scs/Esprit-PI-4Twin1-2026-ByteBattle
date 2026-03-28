/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengeController } from './challenges.controller';
import { ChallengeService } from './challenges.service';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersModule } from '../users/users.module';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { Submission, SubmissionSchema } from './schemas/Submission.schema';
import { Solution, SolutionSchema } from './schemas/solution.schema';
import { CommonRateLimitModule } from '../common/common.module';

@Module({
  imports: [
    CommonRateLimitModule,
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Solution.name, schema: SolutionSchema },
    ]),
    CodeExecutionModule,
    UsersModule,
    GamificationModule,
  ],
  controllers: [ChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}