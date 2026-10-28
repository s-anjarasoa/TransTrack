import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { CreateNotificationDto } from './create-notification';
import { NotificationStatut } from '../../../entities/notification.entity';

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsOptional()
  @IsEnum(NotificationStatut)
  statut?: NotificationStatut;

  @IsOptional()
  @IsBoolean()
  isLue?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchivee?: boolean;
}