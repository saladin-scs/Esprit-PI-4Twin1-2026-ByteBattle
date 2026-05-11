/* DTOs for AI/ML endpoints */

import {
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PredictPerformanceDto {
  @IsString()
  userId: string;

  @IsString()
  challengeId: string;

  @IsObject()
  userFeatures: Record<string, any>;

  @IsObject()
  challengeFeatures: Record<string, any>;
}

export class GetRecommendationsDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;

  @IsOptional()
  @IsString()
  difficulty?: string;
}

export class GetMatchupDto {
  @IsString()
  userId: string;

  @IsObject()
  userFeatures: Record<string, any>;

  @IsArray()
  @IsString({ each: true })
  availableUsers: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}

export class GetAnalyticsDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  daysPeriod?: number;
}

export class GetSimilarUsersDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  count?: number;
}
