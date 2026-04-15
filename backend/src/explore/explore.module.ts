/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Challenge, ChallengeSchema } from '../challenges/schemas/challenge.schema';
import { Competition, CompetitionSchema } from '../competitions/schemas/competition.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ExploreController } from './explore.controller';
import { ExploreService } from './explore.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Challenge.name, schema: ChallengeSchema },
      { name: Competition.name, schema: CompetitionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ExploreController],
  providers: [ExploreService],
})
export class ExploreModule {}
