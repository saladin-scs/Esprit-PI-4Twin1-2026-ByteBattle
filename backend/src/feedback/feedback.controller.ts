/* eslint-disable prettier/prettier */
// src/feedback/feedback.controller.ts
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyzeCodeDto } from './dto/analyze-code.dto';

@ApiTags('Feedback')
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Analyze user code and return feedback' })
  async analyzeCode(@Body() analyzeCodeDto: AnalyzeCodeDto) {
    return this.feedbackService.getFeedback(analyzeCodeDto);
  }
}
