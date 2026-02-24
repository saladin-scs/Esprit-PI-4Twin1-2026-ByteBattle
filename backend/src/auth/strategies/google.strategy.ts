/* eslint-disable prettier/prettier */
// backend/src/auth/strategies/google.strategy.ts
import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

// Export the payload type used by AuthService
export interface GoogleProfilePayload {
  provider: 'google';
  providerId: string;
  email: string | null;
  displayName?: string;
  avatarUrl?: string;
  emailVerified?: boolean;
  accessToken: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);

  constructor(private configService: ConfigService) {
    const clientID = configService.get('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get('GOOGLE_CALLBACK_URL');

    // Check if credentials exist
    if (!clientID || !clientSecret) {
      Logger.warn(
        'Google OAuth credentials not found. Google authentication will be disabled.',
        'GoogleStrategy'
      );
    }

    super({
      clientID: clientID || 'dummy-client-id',
      clientSecret: clientSecret || 'dummy-client-secret',
      // Default path matches AuthController route: /auth/google/callback
      callbackURL:
        callbackURL || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Check if we have real credentials
    const clientID = this.configService.get('GOOGLE_CLIENT_ID');
    if (!clientID) {
      this.logger.error('Google OAuth is not configured');
      return done(new Error('Google authentication is not available'), null);
    }

    const { name, emails, photos } = profile;

    const primaryEmail = emails && emails[0];
    const email = primaryEmail?.value || null;
    const emailVerified = primaryEmail
      ? Boolean(
          // Different passport-google-oauth20 versions use different flags
          (primaryEmail as any).verified ??
            (primaryEmail as any).verified_email ??
            false,
        )
      : false;

    const displayName =
      profile.displayName ||
      `${name?.givenName ?? ''} ${name?.familyName ?? ''}`.trim() ||
      email ||
      `google-${profile.id}`;

    const user: GoogleProfilePayload = {
      provider: 'google',
      providerId: String(profile.id),
      email,
      displayName,
      avatarUrl: photos?.[0]?.value,
      emailVerified,
      accessToken,
    };

    done(null, user);
  }
}