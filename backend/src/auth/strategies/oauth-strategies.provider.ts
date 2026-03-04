/* eslint-disable prettier/prettier */
// backend/src/auth/oauth-strategies.provider.ts
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleStrategy } from '../strategies/google.strategy';
import { GithubStrategy } from '../strategies/github.strategy';

export const OAuthStrategiesProvider: Provider[] = [
  {
    provide: 'GOOGLE_STRATEGY',
    useFactory: (configService: ConfigService) => {
      const clientID = configService.get('GOOGLE_CLIENT_ID');
      const clientSecret = configService.get('GOOGLE_CLIENT_SECRET');
      
      if (clientID && clientSecret) {
        return new GoogleStrategy(configService);
      }
      return null;
    },
    inject: [ConfigService],
  },
  {
    provide: 'GITHUB_STRATEGY',
    useFactory: (configService: ConfigService) => {
      const clientID = configService.get('GITHUB_CLIENT_ID');
      const clientSecret = configService.get('GITHUB_CLIENT_SECRET');
      
      if (clientID && clientSecret) {
        return new GithubStrategy(configService);
      }
      return null;
    },
    inject: [ConfigService],
  },
];