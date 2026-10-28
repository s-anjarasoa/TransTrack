import { IsEnum, IsNumber, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TarifCategorie, TarifType } from '../../../entities/tarif.entity';

export class CreateTarifDto {
  @IsEnum(TarifCategorie)
  categorie!: TarifCategorie;

  @IsOptional()
  @IsEnum(TarifType)
  type?: TarifType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prix!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  prixPromo?: number;

  @IsOptional()
  @IsDateString()
  dateDebut?: string;

  @IsOptional()
  @IsDateString()
  dateFin?: string;

  @Type(() => Number)
  @IsInt()
  routeId!: number;
}