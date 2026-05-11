import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export class GenerateChallengeDto {
  @ApiProperty({
    enum: Difficulty,
    description: 'Difficulty level of the challenge',
  })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ description: 'Topic for the coding challenge' })
  @IsString()
  topic: string;
}
