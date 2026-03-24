import { IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetLeaderboardQueryDto {
  @ApiProperty({
    enum: ['all-time', 'monthly', 'weekly'],
    default: 'all-time',
    required: false,
  })
  @IsOptional()
  @IsEnum(['all-time', 'monthly', 'weekly'])
  period?: 'all-time' | 'monthly' | 'weekly' = 'all-time';

  @ApiProperty({
    enum: ['global', 'speed', 'code_golf', 'algorithmic'],
    default: 'global',
    required: false,
  })
  @IsOptional()
  @IsEnum(['global', 'speed', 'code_golf', 'algorithmic'])
  type?: 'global' | 'speed' | 'code_golf' | 'algorithmic' = 'global';

  @ApiProperty({
    enum: ['easy', 'medium', 'hard', 'expert'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty?: string;

  @ApiProperty({ default: 50, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @ApiProperty({ default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;
}
