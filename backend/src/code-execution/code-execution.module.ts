/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import { CodeExecutionController } from './code-execution.controller';
import { CommonRateLimitModule } from '../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [CommonRateLimitModule, AuthModule],
  providers: [CodeExecutionService],
  controllers: [CodeExecutionController],
  exports: [CodeExecutionService],
})
export class CodeExecutionModule {}
