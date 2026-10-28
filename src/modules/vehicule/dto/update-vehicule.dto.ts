import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsEnum } from 'class-validator';
import { CreateVehiculeDto } from './create-vehicule.dto';
import { VehiculeStatut } from '../../../entities/vehicule.entity';

export class UpdateVehiculeDto extends PartialType(
  OmitType(CreateVehiculeDto, ['moyenTransId'] as const), // le type de transport ne se change pas après coup
) {
  @IsOptional()
  @IsEnum(VehiculeStatut)
  statut?: VehiculeStatut;
}