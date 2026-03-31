/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsDateString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateCompetitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;

  @ApiPropertyOptional({ enum: ['code_golf', 'speed', 'algorithmic'] })
  @IsOptional()
  @IsEnum(['code_golf', 'speed', 'algorithmic'])
  type?: 'code_golf' | 'speed' | 'algorithmic';

  @ApiPropertyOptional({ type: [String], description: 'Challenge IDs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  challengeIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional({ type: [String], enum: ['javascript', 'python', 'java', 'cpp'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prizes?: string[];

  @ApiPropertyOptional({ enum: ['easy', 'medium', 'hard', 'expert'] })
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
}
