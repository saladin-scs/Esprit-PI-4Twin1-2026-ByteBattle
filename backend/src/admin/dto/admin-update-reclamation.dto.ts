import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class AdminUpdateReclamationDto {
  @ApiProperty({ enum: ['open', 'read', 'resolved', 'cancelled'] })
  @IsIn(['open', 'read', 'resolved', 'cancelled'])
  status!: 'open' | 'read' | 'resolved' | 'cancelled';
}
