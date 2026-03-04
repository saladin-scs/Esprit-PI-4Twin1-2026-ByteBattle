/* eslint-disable prettier/prettier */
import { IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ExecuteCodeDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  language: string;

  @ApiProperty()
  @IsArray()
  testCases: Array<{
    input: string;
    expectedOutput: string;
  }>;
}
