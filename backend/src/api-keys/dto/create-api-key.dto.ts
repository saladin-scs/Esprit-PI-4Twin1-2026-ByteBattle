import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'My integration key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name!: string;
}
