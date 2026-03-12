/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { CodeExecutionService } from './code-execution.service';
import { CodeExecutionController } from './code-execution.controller';

@Module({
  providers: [CodeExecutionService],
  controllers: [CodeExecutionController],
  exports: [CodeExecutionService],
})
export class CodeExecutionModule {}
