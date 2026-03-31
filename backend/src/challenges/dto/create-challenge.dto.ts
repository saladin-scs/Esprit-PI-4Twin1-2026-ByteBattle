/* eslint-disable prettier/prettier */
import { IsString, IsEnum, IsArray, IsOptional, IsNumber, IsBoolean, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';

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
  testCases: Array<{ input: string; expectedOutput: string; isHidden?: boolean; isPerformance?: boolean }>;

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

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  timeLimit?: number;

  @ApiProperty()
  @IsNumber()
  @IsOptional()
  memoryLimit?: number;

  @ApiProperty()
  @IsString()
  @IsOptional()
  coverImage?: string;

  @ApiProperty()
  @IsArray()
  @IsOptional()
  hints?: Array<{ text: string; tier: 'basic' | 'detailed' | 'premium'; cost: number }>;
}

/** Aligned with CODE_EXECUTION_MAX_CODE_CHARS (execution rejects beyond this). */
const SUBMIT_CODE_MAX = Number(process.env.CODE_EXECUTION_MAX_CODE_CHARS || 20000);

export class SubmitChallengeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Code cannot be empty' })
  @MaxLength(SUBMIT_CODE_MAX, { message: `Code exceeds maximum size (${SUBMIT_CODE_MAX} characters)` })
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

export class UpdateChallengeDto extends PartialType(CreateChallengeDto) {}