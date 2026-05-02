/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Battle, BattleSchema } from './schemas/battle.schema';
import { BattleService } from './battle.service';
import { BattleGateway } from './battle.gateway';
import { BattleController } from './battle.controller';
import { BattleRealtimeService } from './battle-realtime.service';
import { ChallengeModule } from '../challenges/challenges.module';
import { CodeExecutionModule } from '../code-execution/code-execution.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Battle.name, schema: BattleSchema }]),
    ChallengeModule,
    CodeExecutionModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [BattleController],
  providers: [BattleGateway, BattleService, BattleRealtimeService],
  exports: [BattleService, BattleRealtimeService],
})
export class BattleModule {}
