import {
  IsOptional, IsString, IsEnum, IsInt, Min, Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteStatut } from '../../../entities/route.entity';

export class FilterRouteDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  search?: string;   

  @IsOptional()
  @IsString()
  depart?: string;

  @IsOptional()
  @IsString()
  arrivee?: string;

  @IsOptional()
  @IsEnum(RouteStatut)
  statut?: RouteStatut;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  moyenTransId?: number;

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