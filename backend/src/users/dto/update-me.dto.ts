/* eslint-disable prettier/prettier */
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsDateString, IsObject, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class SocialLinksDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  github?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  portfolio?: string;
}

export class UpdateMeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ description: 'Avatar URL or path (e.g. /uploads/avatars/xxx)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Cover image URL or path (e.g. /uploads/covers/xxx)' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverImage?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  links?: string[];

  @ApiPropertyOptional({ type: SocialLinksDto })
  @IsOptional()
  @IsObject()
  socialLinks?: SocialLinksDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  profilePublic?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  preferences?: Record<string, any>;
}

