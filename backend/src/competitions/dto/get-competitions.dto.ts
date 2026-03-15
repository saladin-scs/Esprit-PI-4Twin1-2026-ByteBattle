/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetCompetitionsDto {
  @ApiPropertyOptional({ enum: ['scheduled', 'active', 'closed', 'archived'] })
  @IsOptional()
  @IsEnum(['scheduled', 'active', 'closed', 'archived'])
  status?: 'scheduled' | 'active' | 'closed' | 'archived';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
