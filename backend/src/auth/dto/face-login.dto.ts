/* eslint-disable prettier/prettier */
import { IsEmail, IsArray, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FaceLoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Face embedding vector (128 floats from face-api.js)' })
  @IsArray()
  @IsNumber({}, { each: true })
  embedding: number[];

  @ApiProperty({ required: false })
  @IsOptional()
  rememberMe?: boolean;
}
