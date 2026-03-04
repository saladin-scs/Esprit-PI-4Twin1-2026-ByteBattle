import { ApiProperty } from '@nestjs/swagger';

export class TwoFaSetupResponseDto {
  @ApiProperty()
  otpauthUrl: string;

  @ApiProperty()
  qrDataUrl: string;

  @ApiProperty({ type: [String] })
  backupCodes: string[];
}

