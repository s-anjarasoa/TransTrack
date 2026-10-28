import { IsDateString, IsInt, Min, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVoyageDto {
  @IsDateString()
  dateDepart!: string;

  @IsDateString()
  dateArrivee!: string;

  @Type(() => Number)
  @IsInt()
  routeId!: number;

  @Type(() => Number)
  @IsInt()
  vehiculeId!: number;

  @IsEnum(['CLASSE', 'ECONOMIE', 'MIXTE'])
  modeTarification!: 'CLASSE' | 'ECONOMIE' | 'MIXTE';
 
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  chauffeurId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  placesClasse?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  
}