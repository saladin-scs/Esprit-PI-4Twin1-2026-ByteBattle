/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key.guard';
import { RecommendationItem } from './dto/recommendation.dto';
import { TrackEngagementDto } from './dto/track-engagement.dto';
import { Post, Body, Logger } from '@nestjs/common';

@Controller('recommendations')
@UseGuards(JwtOrApiKeyAuthGuard)
export class RecommendationController {
  constructor(private readonly recommendationService: RecommendationService) {}

  @Get(':userId')
  async getForUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ): Promise<{ challenges: RecommendationItem[] }> {
    const parsedLimit = limit ? Number(limit) : 8;
    if (Number.isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 50) {
      throw new BadRequestException('limit must be a positive integer up to 50');
    }

    return {
      challenges: await this.recommendationService.getRecommendations(userId, parsedLimit),
    };
  }

  @Post('track')
  async trackEngagement(@Body() dto: TrackEngagementDto) {
    // In a real scenario, this would be sent to a buffer or a real-time ingestion service (Kafka/Redis)
    // for retraining the ML model or updating real-time features.
    Logger.log(`Engagement tracked: ${dto.eventType} for user ${dto.userId} on item ${dto.itemId}`, 'RecommendationController');
    return { ok: true };
  }
}
