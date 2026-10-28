import {IsEnum, IsNumber, IsOptional, IsString, IsNotEmpty, IsBoolean, IsObject, Length,} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationCanal, NotificationPriorite,} from '../../../entities/notification.entity';

export class CreateNotificationDto {
  @IsEnum(NotificationType, { message: 'Type de notification invalide' })
  @IsNotEmpty()
  type!: NotificationType;

  @IsString()
  @Length(1, 200)
  @IsNotEmpty()
  titre!: string;

  @IsString()
  @Length(1, 2000)
  @IsNotEmpty()
  message!: string;

  @IsOptional()
  @IsEnum(NotificationPriorite)
  priorite?: NotificationPriorite;

  @IsOptional()
  @IsEnum(NotificationCanal)
  canal?: NotificationCanal;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  societeId?: number;

  @IsOptional()
  @IsObject()
  metadata?: {
    entityType?: string;
    entityId?: number;
    actionUrl?: string;
    actionLabel?: string;
    icon?: string;
    color?: string;
  };

  @IsOptional()
  @IsBoolean()
  isLue?: boolean;
}