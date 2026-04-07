import { Injectable } from '@nestjs/common';

export type RateLimitActionKind =
  | 'code_run'
  | 'challenge_run'
  | 'challenge_submit'
  | 'reclamation_submit'
  | 'site_rating_submit';

@Injectable()
export class SensitiveRateLimitService {
  async consume(_kind: RateLimitActionKind, _key: string): Promise<void> {
    return;
  }
}
