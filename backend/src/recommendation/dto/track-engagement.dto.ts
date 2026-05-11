/* eslint-disable prettier/prettier */
import { IsString, IsNumber, IsOptional, IsObject, IsEnum } from 'class-validator';

export enum EngagementEventType {
  CLICK = 'click',
  DWELL = 'dwell',
  SCROLL = 'scroll',
  IMPRESSION = 'impression',
}

export class TrackEngagementDto {
  @IsString()
  userId: string;

  @IsString()
  itemId: string;

  @IsEnum(EngagementEventType)
  eventType: EngagementEventType;

  @IsOptional()
  @IsNumber()
  value?: number; // dwell time in ms or scroll depth %

  @IsOptional()
  @IsObject()
  context?: {
    device?: string;
    referrer?: string;
    timeOfDay?: string;
    sessionDuration?: number;
  };
}
