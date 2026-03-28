/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { SITE_RATING_MAX_STARS } from '../schemas/site-rating.schema';

export class SetSiteRatingDto {
  @ApiProperty({ minimum: 1, maximum: SITE_RATING_MAX_STARS, example: 5 })
  @IsInt()
  @Min(1)
  @Max(SITE_RATING_MAX_STARS)
  stars: number;
}
