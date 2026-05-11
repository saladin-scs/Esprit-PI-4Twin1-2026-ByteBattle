import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSolutionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  language: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  explanation: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  timeComplexity?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  spaceComplexity?: string;
}
