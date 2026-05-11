import { Module } from '@nestjs/common';
import { SensitiveRateLimitService } from './sensitive-rate-limit.service';
import { ActionRateLimitGuard } from './action-rate-limit.guard';

@Module({
  providers: [SensitiveRateLimitService, ActionRateLimitGuard],
  exports: [SensitiveRateLimitService, ActionRateLimitGuard],
})
export class CommonRateLimitModule {}
