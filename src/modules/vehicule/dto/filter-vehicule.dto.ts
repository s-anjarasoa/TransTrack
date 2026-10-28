import { IsOptional, IsString, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { VehiculeStatut } from '../../../entities/vehicule.entity';
import { ToBoolean } from 'src/common/decorators/to-boolean.decorator';

export class FilterVehiculeDto {
  @IsOptional() 
  @IsString() 
  immatriculation?: string;

  @IsOptional() 
  @IsEnum(VehiculeStatut) 
  statut?: VehiculeStatut;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  moyenTransId?: number;

  @IsOptional()
  @ToBoolean() 
  @IsBoolean() 
  isActif?: boolean;

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