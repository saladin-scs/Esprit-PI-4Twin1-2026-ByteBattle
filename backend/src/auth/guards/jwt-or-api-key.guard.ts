import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
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

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();
    const apiKey =
      (req.headers['x-api-key'] as string | undefined) ||
      (req.headers['x-api-key'.toLowerCase()] as string | undefined);

    if (apiKey) {
      const authUser = await this.apiKeysService.authenticateKey(String(apiKey));
      if (!authUser) throw new UnauthorizedException('Invalid API key');
      req.user = authUser;
      return true;
    }

    const authHeader = String(req.headers.authorization || '');
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) throw new UnauthorizedException('Missing authentication');

    try {
      const payload = this.jwtService.verify(match[1], {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as any;
      const user = await this.usersService.findOne(String(payload?.sub));
      if (!user) throw new UnauthorizedException('User not found');
      const u = user as any;
      req.user = {
        userId: String(user._id),
        email: u.email ?? payload?.email,
        username: u.username ?? payload?.username,
        roles: Array.isArray(u.roles) && u.roles.length ? u.roles : u.isAdmin ? ['admin'] : ['user'],
        type: payload?.type,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
