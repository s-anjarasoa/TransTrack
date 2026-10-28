import { IsOptional, IsEnum, IsInt, IsString, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { BilletCategorie, BilletStatut } from '../../../entities/billet.entity';

export class FilterBilletsDto {
  @IsOptional() 
  @IsEnum(BilletCategorie) 
  categorie?: BilletCategorie;

  @IsOptional() 
  @IsEnum(BilletStatut) 
  statut?: BilletStatut;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  reservationId?: number;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  clientId?: number;

  @IsOptional() 
  @IsString() 
  numeroBillet?: string;

  @IsOptional() 
  @IsString() 
  numeroPlace?: string;

  @IsOptional() 
  @IsString() 
  passagerNom?: string;

  @IsOptional() 
  @IsString() 
  passagerCIN?: string;

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