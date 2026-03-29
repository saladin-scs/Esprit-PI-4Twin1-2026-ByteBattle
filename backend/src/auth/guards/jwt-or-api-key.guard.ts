/* eslint-disable prettier/prettier */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { ApiKeysService } from '../../api-keys/api-keys.service';

@Injectable()
export class JwtOrApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  private resolveRoles(user: { roles?: string[]; isAdmin?: boolean }): string[] {
    if (Array.isArray(user.roles) && user.roles.length) return [...user.roles];
    if (user.isAdmin) return ['admin'];
    return ['user'];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization as string | undefined;
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const headerKey = (req.headers['x-api-key'] as string | undefined)?.trim();

    const apiKeyCandidate = headerKey || (bearer.startsWith('bb_live_') ? bearer : '');
    if (apiKeyCandidate.startsWith('bb_live_')) {
      const payload = await this.apiKeysService.authenticateKey(apiKeyCandidate);
      if (payload) {
        req.user = payload;
        return true;
      }
    }

    if (bearer && !bearer.startsWith('bb_live_')) {
      try {
        const secret = this.configService.get<string>('JWT_SECRET');
        const payload = this.jwtService.verify(bearer, { secret }) as { sub?: string; email?: string; type?: string };
        if (payload?.sub) {
          const user = await this.usersService.findOne(String(payload.sub));
          if (user) {
            const u = user as { email?: string; username?: string; roles?: string[]; isAdmin?: boolean };
            req.user = {
              userId: String(user._id),
              email: u.email ?? payload.email ?? '',
              username: u.username ?? '',
              roles: this.resolveRoles(u),
              type: payload.type,
            };
            return true;
          }
        }
      } catch {
        /* fall through */
      }
    }

    throw new UnauthorizedException();
  }
}
