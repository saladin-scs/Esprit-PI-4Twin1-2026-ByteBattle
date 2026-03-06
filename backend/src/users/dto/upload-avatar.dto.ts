/* eslint-disable prettier/prettier */
import { ApiProperty } from '@nestjs/swagger';

export class UploadAvatarDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  avatar: Express.Multer.File; // <- this is correct once @types/multer is installed
}