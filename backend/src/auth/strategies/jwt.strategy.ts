/* eslint-disable prettier/prettier */
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * Recharge l’utilisateur en base à chaque requête authentifiée pour que les rôles
 * (ex. promotion admin via make-admin) s’appliquent sans exiger un nouveau login :
 * le JWT peut encore contenir d’anciennes claims `roles`.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  private resolveRoles(user: { roles?: string[]; isAdmin?: boolean }): string[] {
    if (Array.isArray(user.roles) && user.roles.length) return [...user.roles];
    if (user.isAdmin) return ['admin'];
    return ['user'];
  }

  async validate(payload: any) {
    if (!payload?.sub) {
      throw new UnauthorizedException();
    }
    const user = await this.usersService.findOne(String(payload.sub));
    if (!user) {
      throw new UnauthorizedException();
    }
    const u = user as { email?: string; username?: string; roles?: string[]; isAdmin?: boolean };
    return {
      userId: String(user._id),
      email: u.email ?? payload.email,
      username: u.username ?? payload.username,
      roles: this.resolveRoles(u),
      type: payload.type,
    };
  }
}

