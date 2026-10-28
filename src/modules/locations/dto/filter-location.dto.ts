import { IsOptional, IsString, IsInt, Min, IsEnum, IsBooleanString } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationType } from '../../../entities/location.entity';

export class FilterLocationDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsEnum(LocationType)
  type?: LocationType;

  @IsOptional() @IsString()
  province?: string;

  @IsOptional() @IsBooleanString()
  isActive?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number = 100;
}