/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
const MAX_CODE_CHARS = 80_000;

/**
 * DTO for POST /ai/analyze-code
 *
 * Accepts both camelCase (sent by the React frontend) and snake_case variants
 * so the NestJS ValidationPipe (whitelist + forbidNonWhitelisted) never
 * rejects valid frontend payloads.
 */
export class AnalyzeCodeDto {
  // ─── Required ─────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'The code to analyze',
    example: 'def add(a, b):\n    return a + b',
  })
  @IsString()
  @MaxLength(MAX_CODE_CHARS)
  code: string;

  @ApiPropertyOptional({
    description: 'Programming language',
    default: 'python',
    example: 'javascript',
  })
  @IsString()
  @IsOptional()
  language?: string;

  // ─── Tests – snake_case (internal / feedbackApi) ──────────────────────────

  @ApiPropertyOptional({ description: 'Whether all tests passed (snake_case)', example: true })
  @IsBoolean()
  @IsOptional()
  tests_passed?: boolean;

  @ApiPropertyOptional({ description: 'Number of tests passed (snake_case)', example: 3 })
  @IsInt()
  @Min(0)
  @IsOptional()
  tests_passed_count?: number;

  @ApiPropertyOptional({ description: 'Total number of tests (snake_case)', example: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  tests_total?: number;

  // ─── Tests – camelCase (React frontend) ───────────────────────────────────

  @ApiPropertyOptional({ description: 'Whether all tests passed (camelCase)', example: true })
  @IsBoolean()
  @IsOptional()
  testsPassed?: boolean;

  @ApiPropertyOptional({ description: 'Number of tests passed (camelCase)', example: 3 })
  @IsInt()
  @Min(0)
  @IsOptional()
  testsPassedCount?: number;

  @ApiPropertyOptional({ description: 'Total number of tests (camelCase)', example: 5 })
  @IsInt()
  @Min(0)
  @IsOptional()
  testsTotal?: number;

  // ─── Execution error ──────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Execution error message (snake_case)', example: 'SyntaxError: invalid syntax' })
  @IsString()
  @IsOptional()
  execution_error?: string;

  @ApiPropertyOptional({ description: 'Execution error message (camelCase)', example: 'SyntaxError: invalid syntax' })
  @IsString()
  @IsOptional()
  executionError?: string;

  // ─── Runtime ──────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Runtime in milliseconds (snake_case)', example: 150.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300_000)
  runtime_ms?: number;

  @ApiPropertyOptional({ description: 'Runtime in milliseconds (camelCase)', example: 150.5 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300_000)
  runtimeMs?: number;

  // ─── Memory ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({ description: 'Memory usage in KB', example: 1024 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10_000_000)
  memory_kb?: number;

  // ─── Task description ─────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Task/challenge description for AI context (snake_case)',
    example: 'Write a function that adds two numbers',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20_000)
  task_description?: string;

  @ApiPropertyOptional({
    description: 'Task/challenge description for AI context (camelCase)',
    example: 'Write a function that adds two numbers',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20_000)
  taskDescription?: string;
}
