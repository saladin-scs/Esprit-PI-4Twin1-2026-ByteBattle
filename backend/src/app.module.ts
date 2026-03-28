/* eslint-disable prettier/prettier */
// backend/src/app.module.ts – Racine modulaire : config + modules métier
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { validateConfig } from './config/validation';
import { ChallengeModule } from './challenges/challenges.module';
import { CodeExecutionModule } from './code-execution/code-execution.module';
import { GamificationModule } from './gamification/gamification.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { FeedbackModule } from './feedback/feedback.module';
import { ChatModule } from './chat/chat.module';
import { HealthModule } from './health/health.module';
import { ReclamationsModule } from './reclamations/reclamations.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
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
    FeedbackModule,
    ChatModule,
    HealthModule,
    ReclamationsModule,
  ],
})
export class AppModule {}