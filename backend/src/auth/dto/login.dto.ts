import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Whether to persist the session for a longer period',
  })
  @IsOptional()
  rememberMe?: boolean;
}
