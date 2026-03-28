import { Injectable } from '@nestjs/common';
import { RateLimiterMemory } from 'rate-limiter-flexible';

export type RateLimitActionKind =
  | 'code_run'
  | 'challenge_run'
  | 'challenge_submit'
  | 'competition_submit'
  | 'reclamation_submit'
  | 'site_rating_submit';

@Injectable()
export class SensitiveRateLimitService {
  private readonly limiters: Record<RateLimitActionKind, RateLimiterMemory>;

  constructor() {
    const runPoints = Number(process.env.RATE_LIMIT_CHALLENGE_RUN_PER_MINUTE || 45);
    const submitPoints = Number(process.env.RATE_LIMIT_CHALLENGE_SUBMIT_PER_MINUTE || 25);
    const codePoints = Number(process.env.RATE_LIMIT_CODE_EXEC_PER_MINUTE || 45);
    const compSubmit = Number(process.env.RATE_LIMIT_COMPETITION_SUBMIT_PER_MINUTE || 30);
    const reclamationSubmit = Number(process.env.RATE_LIMIT_RECLAMATION_SUBMIT_PER_MINUTE || 10);
    const siteRatingSubmit = Number(process.env.RATE_LIMIT_SITE_RATING_SUBMIT_PER_MINUTE || 30);
    this.limiters = {
      challenge_run: new RateLimiterMemory({ points: runPoints, duration: 60 }),
      challenge_submit: new RateLimiterMemory({ points: submitPoints, duration: 60 }),
      code_run: new RateLimiterMemory({ points: codePoints, duration: 60 }),
      competition_submit: new RateLimiterMemory({ points: compSubmit, duration: 60 }),
      reclamation_submit: new RateLimiterMemory({ points: reclamationSubmit, duration: 60 }),
      site_rating_submit: new RateLimiterMemory({ points: siteRatingSubmit, duration: 60 }),
    };
  }

  async consume(kind: RateLimitActionKind, key: string): Promise<void> {
    await this.limiters[kind].consume(key, 1);
  }
}
