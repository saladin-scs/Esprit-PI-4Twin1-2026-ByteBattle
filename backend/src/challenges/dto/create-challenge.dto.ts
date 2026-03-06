/* eslint-disable prettier/prettier */
import { IsString, IsEnum, IsArray, IsOptional, IsNumber, IsBoolean, IsObject, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type Language = 'javascript' | 'python' | 'java' | 'cpp';

export class CreateChallengeDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsArray()
  examples: Array<{ input: string; output: string; explanation?: string }>;

  @ApiProperty()
  @IsArray()
  testCases: Array<{ input: string; expectedOutput: string }>;

  @ApiProperty({ enum: ['easy', 'medium', 'hard', 'expert'] })
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty: Difficulty;

  @ApiProperty()
  @IsArray()
  languages: Language[];

  @ApiProperty()
  @IsObject()
  starterCode: Record<string, string>;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  tags?: string[];

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  xpReward?: number;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  constraints?: string[];

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class SubmitChallengeDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ enum: ['javascript', 'python', 'java', 'cpp'] })
  @IsEnum(['javascript', 'python', 'java', 'cpp'])
  language: Language;
}

export class GetChallengesDto {
  @IsOptional()
  @IsEnum(['easy', 'medium', 'hard', 'expert'])
  difficulty?: Difficulty;

  @IsOptional()
  @IsString()
  language?: Language;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}