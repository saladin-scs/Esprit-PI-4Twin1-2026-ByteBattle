/* eslint-disable prettier/prettier */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

const CATEGORIES = ['bug', 'account', 'content', 'harassment', 'other'] as const;

export class CreateReclamationDto {
  @ApiPropertyOptional({ enum: CATEGORIES, default: 'other' })
  @IsOptional()
  @IsString()
  @IsIn([...CATEGORIES])
  category?: (typeof CATEGORIES)[number];

  @ApiProperty({ example: 'Impossible de soumettre un défi', minLength: 3, maxLength: 200 })
  @IsString()
  @Length(3, 200)
  subject: string;

  @ApiProperty({ example: 'Décrivez le problème en détail…', minLength: 10, maxLength: 5000 })
  @IsString()
  @Length(10, 5000)
  message: string;
}
