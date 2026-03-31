/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { UsersModule } from '../users/users.module';
import { GamificationModule } from '../gamification/gamification.module';
import { MailService } from './mail.service';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { JwtOrApiKeyAuthGuard } from './guards/jwt-or-api-key.guard';

@Module({
  imports: [
    UsersModule,
    GamificationModule,
    SecurityEventsModule,
    forwardRef(() => ApiKeysModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    GoogleStrategy,
    GithubStrategy,
    MailService,
    JwtOrApiKeyAuthGuard,
  ],
  /** Réexporte Users + ApiKeys pour que JwtOrApiKeyAuthGuard soit résolvable dans CodeExecution, Challenges, etc. */
  exports: [AuthService, JwtModule, JwtOrApiKeyAuthGuard, UsersModule, forwardRef(() => ApiKeysModule)],
})
export class AuthModule {}