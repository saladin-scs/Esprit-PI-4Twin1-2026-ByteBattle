/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsArray, IsDateString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateCompetitionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({ enum: ['code_golf', 'speed', 'algorithmic'] })
  @IsEnum(['code_golf', 'speed', 'algorithmic'])
  type: 'code_golf' | 'speed' | 'algorithmic';

  @ApiProperty({ type: [String], description: 'Challenge IDs' })
  @IsArray()
  @IsString({ each: true })
  challengeIds: string[];

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsDateString()
  endTime: string;

  @ApiPropertyOptional({ type: [String], enum: ['javascript', 'python', 'java', 'cpp'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedLanguages?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rules?: string;
}
