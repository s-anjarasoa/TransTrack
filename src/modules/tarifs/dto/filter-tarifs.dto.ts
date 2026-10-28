import { IsOptional, IsEnum, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ToBoolean } from 'src/common/decorators/to-boolean.decorator';
import { TarifCategorie, TarifType } from '../../../entities/tarif.entity';

export class FilterTarifDto {
  @IsOptional() 
  @IsEnum(TarifCategorie) 
  categorie?: TarifCategorie;

  @IsOptional() 
  @IsEnum(TarifType) 
  type?: TarifType;

  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  routeId?: number;
  
  @IsOptional()
  @ToBoolean()
  @IsBoolean() 
  isActif?: boolean;
  
  @IsOptional() 
  @Type(() => Number) 
  @IsInt() 
  @Min(1) 
  societeId?: number;

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