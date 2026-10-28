// src/modules/bagages/dto/filter-bagages.dto.ts
import { IsOptional, IsEnum, IsInt, IsString, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { BagageType } from '../../../entities/bagage.entity';

export class FilterBagagesDto {
  @IsOptional()
  @IsEnum(BagageType)
  type?: BagageType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reservationId?: number;

  @IsOptional()
  @IsString()
  numeroEtiquette?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  poidsMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  poidsMax?: number;

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