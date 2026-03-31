/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';
import { Competition, CompetitionSchema } from './schemas/competition.schema';
import { CompetitionSubmission, CompetitionSubmissionSchema } from './schemas/competition-submission.schema';
import { ChallengeModule } from '../challenges/challenges.module';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Competition.name, schema: CompetitionSchema },
      { name: CompetitionSubmission.name, schema: CompetitionSubmissionSchema },
    ]),
    ChallengeModule,
    CodeExecutionModule,
    GamificationModule,
    UsersModule,
    NotificationsModule,
  ],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
