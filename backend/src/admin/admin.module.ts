import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Challenge, ChallengeSchema } from '../challenges/schemas/challenge.schema';
import { Competition, CompetitionSchema } from '../competitions/schemas/competition.schema';
import {
  CompetitionSubmission,
  CompetitionSubmissionSchema,
} from '../competitions/schemas/competition-submission.schema';
import { Submission, SubmissionSchema } from '../challenges/schemas/Submission.schema';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ChatModule } from '../chat/chat.module';
import { ReclamationsModule } from '../reclamations/reclamations.module';

@Module({
  imports: [
    ChatModule,
    ReclamationsModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Competition.name, schema: CompetitionSchema },
      { name: CompetitionSubmission.name, schema: CompetitionSubmissionSchema },
      { name: Submission.name, schema: SubmissionSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

