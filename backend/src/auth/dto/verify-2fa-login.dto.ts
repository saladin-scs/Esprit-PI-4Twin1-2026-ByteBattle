import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Verify2FALoginDto {
  @ApiProperty()
  @IsString()
  twoFactorToken: string;

  @ApiProperty()
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Whether to persist the session longer' })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}

