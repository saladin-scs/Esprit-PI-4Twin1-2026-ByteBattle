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
  ],
})
export class AppModule {}