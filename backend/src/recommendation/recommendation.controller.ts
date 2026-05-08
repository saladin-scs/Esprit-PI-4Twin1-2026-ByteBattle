/* eslint-disable prettier/prettier */
import { Controller, Get, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { RecommendationService } from './recommendation.service';
import { JwtOrApiKeyAuthGuard } from '../auth/guards/jwt-or-api-key.guard';
import { RecommendationItem } from './dto/recommendation.dto';

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
}
