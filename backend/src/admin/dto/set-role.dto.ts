import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class SetRoleDto {
  @ApiProperty({ enum: ['user', 'moderator', 'admin'], example: 'admin' })
  @IsIn(['user', 'moderator', 'admin'])
  role: 'user' | 'moderator' | 'admin';
}
