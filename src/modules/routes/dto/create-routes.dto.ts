import {
  IsString, IsOptional, IsNumber, IsInt, Min, Length,
  IsEnum, IsArray, ValidateNested, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RouteStatut } from '../../../entities/route.entity';
import { RouteStopDto } from './route-stop.dto';

export class CreateRouteDto {
  @IsOptional()
  @IsString()
  @Length(2, 150)
  nom?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RouteStopDto)
  stops?: RouteStopDto[];

  @IsOptional()
  @IsString()
  @Length(1, 100)
  depart?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  arrivee?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  pointDepart?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  pointArrivee?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  dureeEstimee?: number;

  @IsOptional()
  @IsEnum(RouteStatut)
  statut?: RouteStatut;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  description?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  moyenTransId!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  societeId?: number;
}