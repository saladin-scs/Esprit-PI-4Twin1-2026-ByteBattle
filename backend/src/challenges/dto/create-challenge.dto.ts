import { IsString, IsArray, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class CreateChallengeDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ enum: Difficulty })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty()
  @IsArray()
  testCases: Array<{
    input: any;
    expectedOutput: any;
    isHidden: boolean;
  }>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  starterCode?: string;

  @ApiProperty()
  @IsArray()
  tags: string[];
}

