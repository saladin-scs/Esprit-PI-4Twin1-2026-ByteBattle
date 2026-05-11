import { IsMongoId } from 'class-validator';

export class BattleIdParamDto {
  @IsMongoId()
  id: string;
}

