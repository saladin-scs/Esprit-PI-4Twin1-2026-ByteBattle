/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength, Min, Max } from 'class-validator';

const MAX_CODE_CHARS = 80_000;

export class AnalyzeCodeDto {
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
    example: 'python',
  })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({
    description: 'Whether all tests passed',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  tests_passed?: boolean;

  @ApiPropertyOptional({
    description: 'Execution error message if any',
    example: 'SyntaxError: invalid syntax',
  })
  @IsString()
  @IsOptional()
  execution_error?: string;

  @ApiPropertyOptional({
    description: 'Runtime in milliseconds',
    example: 150.5,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(300000)
  runtime_ms?: number;

  @ApiPropertyOptional({
    description: 'Memory usage in KB',
    example: 1024,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10_000_000)
  memory_kb?: number;

  @ApiPropertyOptional({
    description: 'Task description for context',
    example: 'Write a function that adds two numbers',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20_000)
  task_description?: string;
}

