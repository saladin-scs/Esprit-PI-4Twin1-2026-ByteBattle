/* eslint-disable prettier/prettier */
// src/feedback/feedback.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
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
  @ApiOperation({
    summary: 'Analyse du code par le service IA (contexte exécution optionnel)',
  })
  async analyzeCode(
    @Body() analyzeCodeDto: AnalyzeCodeDto,
    @Req() req: { user: { userId: string } },
  ) {
    return this.feedbackService.getFeedback(analyzeCodeDto, req.user.userId);
  }
}
