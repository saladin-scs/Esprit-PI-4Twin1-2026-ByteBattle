import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ReportChatMessageDto {
  @ApiProperty({ example: '661cf38db8d4f8d33a677abc' })
  @IsString()
  messageId!: string;

  @ApiProperty({ example: 'competition:661cf38db8d4f8d33a677fff' })
  @IsString()
  room!: string;

  @ApiProperty({ required: false, example: 'Spam message' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
