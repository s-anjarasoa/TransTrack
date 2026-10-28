import { IsOptional, IsString, IsDateString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVoyageDto {
  @IsOptional() @IsDateString() dateDepart?: string;
  @IsOptional() @IsDateString() dateArrivee?: string;
  @IsOptional() @Type(() => Number) @IsInt() chauffeurId?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) retardMinutes?: number;
  
  // ✅ Ajoutez ces deux lignes si vous voulez permettre leur modification :
  @IsOptional() @Type(() => Number) @IsInt() routeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() vehiculeId?: number;

  @IsOptional() @IsEnum(['CLASSE', 'ECONOMIE', 'MIXTE']) modeTarification?: 'CLASSE' | 'ECONOMIE' | 'MIXTE';
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) placesClasse?: number;
}