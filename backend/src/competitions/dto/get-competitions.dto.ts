/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsInt, Min, Max, IsString, MaxLength } from 'class-validator';
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

  @ApiPropertyOptional({ enum: ['code_golf', 'speed', 'algorithmic'] })
  @IsOptional()
  @IsEnum(['code_golf', 'speed', 'algorithmic'])
  type?: 'code_golf' | 'speed' | 'algorithmic';

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard', 'expert'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';

  @ApiPropertyOptional({ enum: ['javascript', 'python', 'java', 'cpp'] })
  @IsOptional()
  @IsEnum(['javascript', 'python', 'java', 'cpp'])
  language?: 'javascript' | 'python' | 'java' | 'cpp';

  @ApiPropertyOptional({ description: 'Free-text search on contest name and description' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: ['startTime', 'endTime', 'submissions'], default: 'startTime' })
  @IsOptional()
  @IsEnum(['startTime', 'endTime', 'submissions'])
  sortBy?: 'startTime' | 'endTime' | 'submissions' = 'startTime';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
