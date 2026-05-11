import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { UsersModule } from '../users/users.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { SetupCache } from '../core/cache/setup-cache';
import { UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    UsersModule,
    CompetitionsModule,
  ],
  controllers: [LeaderboardController],
  providers: [LeaderboardService, SetupCache],
  exports: [LeaderboardService, SetupCache],
})
export class LeaderboardModule {}
