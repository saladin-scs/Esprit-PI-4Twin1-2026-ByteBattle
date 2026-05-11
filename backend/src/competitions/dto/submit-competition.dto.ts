/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

export class SubmitCompetitionDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty({ enum: ['javascript', 'python', 'java', 'cpp'] })
  @IsEnum(['javascript', 'python', 'java', 'cpp'])
  language: string;

  /** For algorithmic competitions with multiple challenges */
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  challengeId?: string;
}
