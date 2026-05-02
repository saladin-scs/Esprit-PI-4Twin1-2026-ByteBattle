/* eslint-disable prettier/prettier */
import {
  IsEmail,
  IsString,
  MinLength,
  IsArray,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  MaxLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

/** Trim; turn empty string into undefined so @IsOptional skips other validators (matches multi-step forms). */
function optionalString() {
  return Transform(({ value }: { value: unknown }) => {
    if (value === null || value === undefined) return undefined;
    if (typeof value !== 'string') return value;
    const t = value.trim();
    return t === '' ? undefined : t;
  });
}

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'username123' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username may only contain letters, numbers, and underscores' })
  username: string;

  @ApiProperty({ example: 'Password1!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, example: 'Ada' })
  @IsOptional()
  @optionalString()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName?: string;

  @ApiProperty({ required: false, example: 'Lovelace' })
  @IsOptional()
  @optionalString()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName?: string;

  @ApiProperty({ required: false, description: 'E.164 or digits as sent by the client (e.g. react-phone-input-2)' })
  @IsOptional()
  @optionalString()
  @IsString()
  @MinLength(6)
  @MaxLength(24)
  phone?: string;

  @ApiProperty({ required: false, example: '2000-01-15' })
  @IsOptional()
  @optionalString()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 1) return true;
    if (value === 'false' || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean()
  newsletter?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @optionalString()
  @IsString()
  @MaxLength(200)
  referralSource?: string;

  /** When present and non-empty, must be exactly 128 floats (face-api.js descriptor). */
  @ApiProperty({ required: false, description: 'Face embedding vector (128 floats)' })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ValidateIf((_, v) => Array.isArray(v) && v.length > 0)
  @ArrayMinSize(128)
  @ArrayMaxSize(128)
  faceDescriptor?: number[];
}