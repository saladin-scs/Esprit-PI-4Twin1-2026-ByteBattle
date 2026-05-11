import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

const RECLAMATION_STATUSES = ['open', 'read', 'resolved', 'cancelled'] as const;
const RECLAMATION_CATEGORIES = ['bug', 'account', 'content', 'harassment', 'other'] as const;
const SORT_VALUES = ['newest', 'oldest'] as const;

export class ListMineReclamationsDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: RECLAMATION_STATUSES })
  @IsOptional()
  @IsString()
  @IsIn(RECLAMATION_STATUSES)
  status?: (typeof RECLAMATION_STATUSES)[number];

  @ApiPropertyOptional({ enum: RECLAMATION_CATEGORIES })
  @IsOptional()
  @IsString()
  @IsIn(RECLAMATION_CATEGORIES)
  category?: (typeof RECLAMATION_CATEGORIES)[number];

  @ApiPropertyOptional({ description: 'Search in subject and message', maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  q?: string;

  @ApiPropertyOptional({ enum: SORT_VALUES, default: 'newest' })
  @IsOptional()
  @IsString()
  @IsIn(SORT_VALUES)
  sort?: (typeof SORT_VALUES)[number];
}
