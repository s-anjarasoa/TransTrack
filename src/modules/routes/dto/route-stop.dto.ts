import {
  IsInt, Min, IsOptional, IsString, Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RouteStopDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  locationId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordre!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  heureDepartRel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  heureArriveeRel?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}