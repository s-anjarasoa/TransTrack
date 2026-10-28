import { IsOptional, IsString, IsEmail, IsPhoneNumber, IsDateString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SocieteStatut } from '../../../entities/societe.entity';

export class FilterSocietesDto {
  @IsOptional() 
  @IsString() 
  name?: string;

  @IsOptional()
  @IsPhoneNumber() 
  phone?: string;

  @IsOptional() 
  @IsEmail() 
  email?: string;

  @IsOptional() 
  @IsString() 
  address?: string;
  
  @IsOptional() 
  @IsString() 
  nif?: string;
  
  @IsOptional() 
  @IsString() 
  numState?: string;

  @IsOptional()
  @IsEnum(SocieteStatut)
  statut?: SocieteStatut;

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
  @IsInt() @Min(1) 
  page?: number = 1;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() @Min(1) 
  limit?: number = 10;
}