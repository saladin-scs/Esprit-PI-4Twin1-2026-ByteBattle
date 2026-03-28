/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

const STATUSES = ['open', 'read', 'resolved', 'cancelled'] as const;

export class AdminUpdateReclamationDto {
  @ApiProperty({ enum: STATUSES })
  @IsIn([...STATUSES])
  status: (typeof STATUSES)[number];
}
