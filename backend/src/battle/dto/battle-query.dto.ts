import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BattleListQueryDto {
  @IsOptional()
  @IsIn(['waiting', 'active', 'finished'])
  status?: 'waiting' | 'active' | 'finished';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

