/* eslint-disable prettier/prettier */
// src/feedback/feedback.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyzeCodeDto } from './dto/analyze-code.dto';

@ApiTags('Feedback')
@Controller('ai')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('analyze-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Code analysis by AI service (optional execution context)',
  })
  async analyzeCode(
    @Body() dto: AnalyzeCodeDto,
    @Req() req: { user: { userId: string } },
  ) {
    // Normalise: prefer snake_case values; fall back to camelCase equivalents
    // sent by the React frontend. This bridges the two naming conventions
    // without changing the FeedbackService contract.
    const normalised = {
      code: dto.code,
      language: dto.language,
      tests_passed:
        dto.tests_passed !== undefined ? dto.tests_passed : dto.testsPassed,
      tests_passed_count:
        dto.tests_passed_count !== undefined
          ? dto.tests_passed_count
          : dto.testsPassedCount,
      tests_total:
        dto.tests_total !== undefined ? dto.tests_total : dto.testsTotal,
      execution_error:
        dto.execution_error !== undefined
          ? dto.execution_error
          : dto.executionError,
      runtime_ms:
        dto.runtime_ms !== undefined ? dto.runtime_ms : dto.runtimeMs,
      memory_kb: dto.memory_kb,
      task_description:
        dto.task_description !== undefined
          ? dto.task_description
          : dto.taskDescription,
    };

    return this.feedbackService.getFeedback(normalised, req.user.userId);
  }
}
