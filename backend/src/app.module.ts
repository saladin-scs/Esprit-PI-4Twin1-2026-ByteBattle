/* eslint-disable prettier/prettier */
// backend/src/app.module.ts - Modular root: config + business modules
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { validateConfig } from './config/validation';
import { ChallengeModule } from './challenges/challenges.module';
import { CodeExecutionModule } from './code-execution/code-execution.module';
import { GamificationModule } from './gamification/gamification.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env'),
        join(process.cwd(), 'backend', '.env.local'),
        join(process.cwd(), 'backend', '.env'),
        join(process.cwd(), '..', '.env.local'),
        join(process.cwd(), '..', '.env'),
      ],
      validate: validateConfig,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
      }),
    }),
    AuthModule,
    AdminModule,
    CodeExecutionModule,
    ChallengeModule,
    GamificationModule,
    CompetitionsModule,
    LeaderboardModule,
    AiModule,
  ],
})
export class AppModule {}
