/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'CI classroom' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;
}
