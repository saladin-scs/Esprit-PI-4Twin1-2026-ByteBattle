import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Disable2FADto {
  @ApiProperty()
  @IsString()
  code: string;
}
