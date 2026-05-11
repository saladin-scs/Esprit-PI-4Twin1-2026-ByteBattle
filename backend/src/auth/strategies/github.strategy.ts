/* eslint-disable prettier/prettier */
// backend/src/auth/strategies/github.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

// Export the payload type used by AuthService
export interface GithubProfilePayload {
  provider: 'github';
  providerId: string;
  email: string | null;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  accessToken: string;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private readonly logger = new Logger(GithubStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get('GITHUB_CLIENT_ID');
    const clientSecret = configService.get('GITHUB_CLIENT_SECRET');
    const callbackURL = configService.get('GITHUB_CALLBACK_URL');

    if (!clientID || !clientSecret) {
      Logger.warn(
        'GitHub OAuth credentials not found. GitHub authentication will be disabled.',
        'GithubStrategy'
      );
    }

    const baseUrl = configService.get('BASE_URL') || 'http://localhost:3000';
    const finalCallbackURL = callbackURL || `${baseUrl.replace(/\/+$/, '')}/auth/github/callback`;

    super({
      clientID: clientID || 'dummy-client-id',
      clientSecret: clientSecret || 'dummy-client-secret',
      callbackURL: finalCallbackURL,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<GithubProfilePayload> {
    const clientID = this.configService.get('GITHUB_CLIENT_ID');
    if (!clientID) {
      this.logger.error('GitHub OAuth is not configured');
      throw new Error('GitHub authentication is not available');
    }

    const { username, emails, photos } = profile;

    const primaryEmail = emails && emails[0];
    const email = primaryEmail?.value || null;
    const emailVerified = primaryEmail ? Boolean(primaryEmail.verified) : false;
    const avatarUrl = photos?.[0]?.value;

    return {
      provider: 'github',
      providerId: String(profile.id),
      email,
      username,
      displayName: profile.displayName || username,
      avatarUrl,
      emailVerified,
      accessToken,
    };
  }
}