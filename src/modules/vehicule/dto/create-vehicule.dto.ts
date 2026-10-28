import { IsString, IsInt, IsOptional, IsEnum, Min, Max, IsDateString, Length } from 'class-validator';
import { Type } from 'class-transformer';
import { VehiculeStatut } from '../../../entities/vehicule.entity';

export class CreateVehiculeDto {
  @IsString()
  @Length(4, 20)
  immatriculation!: string;

  @IsString()
  marque!: string;

  @IsString()
  modele!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1970)
  @Max(new Date().getFullYear() + 1)
  annee?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacite!: number;

  @IsOptional()
  @IsString()
  couleur?: string;

  @IsOptional()
  @IsString()
  numeroChassis?: string;

  @IsOptional()
  @IsDateString()
  dateAssurance?: string;

  @IsOptional()
  @IsDateString()
  dateVisiteTechnique?: string;

  // societeId retiré : déduit de req.user côté service, jamais fourni par le client
  @Type(() => Number)
  @IsInt()
  moyenTransId!: number;
}