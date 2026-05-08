/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChallengeController } from './challenges.controller';
import { ChallengeService } from './challenges.service';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { SensitiveRateLimitService } from '../common/sensitive-rate-limit.service';
import { Challenge, ChallengeSchema } from './schemas/challenge.schema';
import { Submission, SubmissionSchema } from './schemas/Submission.schema';
import { Solution, SolutionSchema } from './schemas/solution.schema';
import { ChallengeSession, ChallengeSessionSchema } from './schemas/challenge-session.schema';
import { CommonRateLimitModule } from '../common/common.module';

@Module({
  imports: [
    CommonRateLimitModule,
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Solution.name, schema: SolutionSchema },
      { name: ChallengeSession.name, schema: ChallengeSessionSchema },
    ]),
    CodeExecutionModule,
    UsersModule,
    GamificationModule,
    NotificationsModule,
    AuthModule,
    RecommendationModule,
  ],
  controllers: [ChallengeController],
  providers: [ChallengeService, SensitiveRateLimitService],
  exports: [ChallengeService],
})
export class ChallengeModule {}