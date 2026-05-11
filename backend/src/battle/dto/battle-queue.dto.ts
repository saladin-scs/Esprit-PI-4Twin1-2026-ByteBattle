import { IsIn, IsOptional } from 'class-validator';

export class BattleQueueDto {
  @IsOptional()
  @IsIn(['1v1', '2v2', '3v3', '4v4', '5v5'])
  mode?: '1v1' | '2v2' | '3v3' | '4v4' | '5v5';
}

