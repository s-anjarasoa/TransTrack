import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { VoyageStatut } from '../../../entities/voyage.entity';

export class FilterVoyageDto {
  @IsOptional() 
  @IsString() 
  depart?: string;
  
  @IsOptional() 
  @IsString() 
  arrivee?: string;
  
  @IsOptional() 
  @IsEnum(VoyageStatut) 
  statut?: VoyageStatut;
  
  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  routeId?: number;
  
  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  vehiculeId?: number;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  societeId?: number; // Admin seulement
  
  @IsOptional() 
  @IsDateString() 
  fromDate?: string;
  
  @IsOptional() 
  @IsDateString() 
  toDate?: string;
  
  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  placesMin?: number; // places disponibles ≥ X (recherche client)

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