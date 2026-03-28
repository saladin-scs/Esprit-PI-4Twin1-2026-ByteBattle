/* eslint-disable prettier/prettier */
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActionRateLimitGuard, RateLimitAction } from '../common/action-rate-limit.guard';
import { SetSiteRatingDto } from './dto/set-site-rating.dto';
import { SiteRatingsService } from './site-ratings.service';

@ApiTags('Site ratings')
@Controller('site-ratings')
export class SiteRatingsController {
  constructor(private readonly siteRatingsService: SiteRatingsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Moyenne et nombre d’avis (public)' })
  getStats() {
    return this.siteRatingsService.getStats();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ma note actuelle (1–5), ou null' })
  getMine(@Req() req: { user: { userId: string } }) {
    return this.siteRatingsService.getMine(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, ActionRateLimitGuard)
  @RateLimitAction('site_rating_submit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enregistrer ou mettre à jour ma note (1 à 5 étoiles)' })
  async setRating(@Body() dto: SetSiteRatingDto, @Req() req: { user: { userId: string } }) {
    return this.siteRatingsService.setRating(req.user.userId, dto.stars);
  }
}
