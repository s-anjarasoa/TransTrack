import { IsOptional, IsEnum, IsInt, IsString, Min, IsBoolean, IsDateString,} from 'class-validator';
import { Type } from 'class-transformer';
import {  NotificationType, NotificationCanal, NotificationPriorite, NotificationStatut,} from '../../../entities/notification.entity';

export class FilterNotificationsDto {
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationCanal)
  canal?: NotificationCanal;

  @IsOptional()
  @IsEnum(NotificationPriorite)
  priorite?: NotificationPriorite;

  @IsOptional()
  @IsEnum(NotificationStatut)
  statut?: NotificationStatut;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  societeId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isLue?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isArchivee?: boolean;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}