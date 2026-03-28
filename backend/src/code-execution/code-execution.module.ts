/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import { CodeExecutionController } from './code-execution.controller';
import { CommonRateLimitModule } from '../common/common.module';

@Module({
  imports: [CommonRateLimitModule],
  providers: [CodeExecutionService],
  controllers: [CodeExecutionController],
  exports: [CodeExecutionService],
})
export class CodeExecutionModule {}
