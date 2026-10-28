import { IsEnum, IsInt, IsOptional } from 'class-validator';
import { AbonnementType } from '../../../entities/abonnement.entity';

export class SubscribeDto {
  @IsEnum(AbonnementType)
  type!: AbonnementType;

  @IsOptional()
  @IsInt()
  societeId?: number;
}