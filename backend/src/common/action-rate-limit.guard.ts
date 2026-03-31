import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SensitiveRateLimitService, type RateLimitActionKind } from './sensitive-rate-limit.service';

export const RATE_LIMIT_KIND_KEY = 'bb_rate_limit_kind';

export const RateLimitAction = (kind: RateLimitActionKind) => SetMetadata(RATE_LIMIT_KIND_KEY, kind);

@Injectable()
export class ActionRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: SensitiveRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const kind = this.reflector.getAllAndOverride<RateLimitActionKind>(RATE_LIMIT_KIND_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!kind) return true;
    const req = context.switchToHttp().getRequest();
    const userId = req.user?.userId;
    const key = userId ? `u:${userId}` : `ip:${req.ip || req.connection?.remoteAddress || 'unknown'}`;
    try {
      await this.limits.consume(kind, key);
    } catch {
      throw new HttpException(
        'Too many requests for this action. Try again in about a minute.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
