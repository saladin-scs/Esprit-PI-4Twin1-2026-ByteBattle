import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional } from 'class-validator';

export class AdminUpdateUserDto {
  @ApiPropertyOptional({ type: [String], example: ['admin'] })
  @IsOptional()
  @IsArray()
  @IsIn(['user', 'moderator', 'admin'], { each: true })
  roles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

