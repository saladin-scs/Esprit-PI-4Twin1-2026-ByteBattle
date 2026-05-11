import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersPublicController } from './users.public.controller';
import { User, UserSchema } from './schemas/user.schema';
import { SecurityEventsModule } from '../security-events/security-events.module';
import {
  Submission,
  SubmissionSchema,
} from '../challenges/schemas/Submission.schema';
import {
  Solution,
  SolutionSchema,
} from '../challenges/schemas/solution.schema';
import {
  CompetitionSubmission,
  CompetitionSubmissionSchema,
} from '../competitions/schemas/competition-submission.schema';
import {
  Reclamation,
  ReclamationSchema,
} from '../reclamations/schemas/reclamation.schema';
import {
  SiteRating,
  SiteRatingSchema,
} from '../site-ratings/schemas/site-rating.schema';
import {
  Notification,
  NotificationSchema,
} from '../notifications/schemas/notification.schema';
import { ApiKey, ApiKeySchema } from '../api-keys/schemas/api-key.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Solution.name, schema: SolutionSchema },
      { name: CompetitionSubmission.name, schema: CompetitionSubmissionSchema },
      { name: Reclamation.name, schema: ReclamationSchema },
      { name: SiteRating.name, schema: SiteRatingSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: ApiKey.name, schema: ApiKeySchema },
    ]),
    SecurityEventsModule,
  ],
  controllers: [UsersController, UsersPublicController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
