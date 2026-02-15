// src/ai/ai.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-challenge')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a coding challenge using AI' })
  async generateChallenge(@Body() body: { difficulty: string; topic: string }) {
    const { difficulty, topic } = body;
    return this.aiService.generateChallenge(difficulty, topic);
  }

  @Post('analyze-code')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze code using Python AI service' })
  async analyzeCode(
    @Body()
    body: {
      code: string;
      language?: string;
      tests_passed?: boolean;
      execution_error?: string;
      runtime_ms?: number;
      memory_kb?: number;
      task_description?: string;
    },
  ) {
    return this.aiService.analyzeCode(body);
  }
}
