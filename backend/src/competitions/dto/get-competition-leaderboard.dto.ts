import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class GetCompetitionLeaderboardDto {
  @ApiPropertyOptional({ enum: ['javascript', 'python', 'java', 'cpp'] })
  @IsOptional()
  @IsEnum(['javascript', 'python', 'java', 'cpp'])
  language?: 'javascript' | 'python' | 'java' | 'cpp';

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
