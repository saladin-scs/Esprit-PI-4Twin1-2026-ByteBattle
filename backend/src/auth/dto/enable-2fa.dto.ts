import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty()
  @IsString()
  code: string;
}

