import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refresh_token?: string;
}
